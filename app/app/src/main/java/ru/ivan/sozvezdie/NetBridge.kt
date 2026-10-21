package ru.ivan.sozvezdie

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.bluetooth.BluetoothDevice
import android.net.nsd.NsdManager
import android.net.nsd.NsdServiceInfo
import android.net.wifi.WifiManager
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.UUID
import kotlin.concurrent.thread

/**
 * Мост для сетевой игры: Bluetooth (RFCOMM) и локальная сеть Wi-Fi (TCP + поиск через NSD).
 * Сообщения — строки JSON, по одной в строке. Логика партии и проверка ходов — в JS (net.js).
 * При обрыве гость сам переподключается, хозяин снова ждёт подключения.
 */
@SuppressLint("MissingPermission")
class NetBridge(private val act: MainActivity) {
    companion object {
        val UUID_SOZ: UUID = UUID.fromString("7d3f1a52-5c2e-4a8b-9f61-0c5e2b7a9d14")
        const val PORT = 47123
        const val NSD_TYPE = "_sozvezdie._tcp."
    }
    @Volatile private var out: OutputStream? = null
    @Volatile private var closed = true
    private var btServer: BluetoothServerSocket? = null
    private var tcpServer: ServerSocket? = null
    private var sock: java.io.Closeable? = null
    private var nsd: NsdManager? = null
    private var nsdReg: NsdManager.RegistrationListener? = null
    private var nsdDisc: NsdManager.DiscoveryListener? = null
    private var receiver: BroadcastReceiver? = null
    private var mlock: WifiManager.MulticastLock? = null

    private fun q(s: String) = JSONObject.quote(s)
    fun status(st: String, info: String = "") = act.js("window.__netStatus && window.__netStatus(${q(st)}, ${q(info)})")
    private fun event(name: String, data: String) = act.js("window.__netEvent && window.__netEvent(${q(name)}, $data)")
    private val bt: BluetoothAdapter? get() = (act.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager?)?.adapter

    private fun pump(s: java.io.Closeable, input: java.io.InputStream, o: OutputStream, onDrop: () -> Unit) {
        sock = s; out = o; status("online")
        try {
            val r = BufferedReader(InputStreamReader(input, Charsets.UTF_8))
            while (!closed) { val line = r.readLine() ?: break; act.js("window.__netIn && window.__netIn(${q(line)})") }
        } catch (_: Exception) {}
        out = null; try { s.close() } catch (_: Exception) {}
        if (!closed) { status("offline", "Связь потеряна, переподключаюсь…"); onDrop() }
    }

    @JavascriptInterface fun send(msg: String): Boolean {
        val o = out ?: return false
        thread { try { synchronized(this) { o.write((msg.replace("\n", " ") + "\n").toByteArray(Charsets.UTF_8)); o.flush() } } catch (_: Exception) {} }
        return true
    }

    @JavascriptInterface fun btAvailable(): Boolean = bt != null
    @JavascriptInterface fun btEnabled(): Boolean = bt?.isEnabled == true

    /** Хозяин Bluetooth: делает телефон видимым и ждёт гостя. */
    @JavascriptInterface fun btHost() = act.withBtPermissions {
        val a = bt ?: return@withBtPermissions status("error", "На этом телефоне нет Bluetooth")
        if (!a.isEnabled) { act.startActivity(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)); return@withBtPermissions status("error", "Включи Bluetooth и нажми ещё раз") }
        closed = false
        try { act.startActivity(Intent(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE).putExtra(BluetoothAdapter.EXTRA_DISCOVERABLE_DURATION, 300)) } catch (_: Exception) {}
        thread {
            while (!closed) {
                try {
                    status("waiting", "Жду соперника. Имя телефона: ${a.name ?: "?"}")
                    btServer = a.listenUsingRfcommWithServiceRecord("Sozvezdie", UUID_SOZ)
                    val s: BluetoothSocket = btServer!!.accept()
                    try { btServer?.close() } catch (_: Exception) {}
                    pump(s, s.inputStream, s.outputStream) {}
                } catch (e: Exception) { if (!closed) { status("error", "Bluetooth: ${e.message}"); Thread.sleep(2000) } }
            }
        }
    }

    /** Список сопряжённых и найденных рядом телефонов: событие btDevices. */
    @JavascriptInterface fun btScan() = act.withBtPermissions {
        val a = bt ?: return@withBtPermissions status("error", "На этом телефоне нет Bluetooth")
        if (!a.isEnabled) { act.startActivity(Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE)); return@withBtPermissions status("error", "Включи Bluetooth и нажми ещё раз") }
        val found = LinkedHashMap<String, String>()
        a.bondedDevices?.forEach { found[it.address] = (it.name ?: it.address) + " (сопряжён)" }
        fun emit() { val arr = JSONArray(); found.forEach { (k, v) -> arr.put(JSONObject().put("address", k).put("name", v)) }; event("btDevices", arr.toString()) }
        emit()
        receiver?.let { try { act.unregisterReceiver(it) } catch (_: Exception) {} }
        receiver = object : BroadcastReceiver() { override fun onReceive(c: Context, i: Intent) {
            if (i.action == BluetoothDevice.ACTION_FOUND) {
                @Suppress("DEPRECATION") val d: BluetoothDevice? = i.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE)
                if (d != null && !found.containsKey(d.address)) { found[d.address] = d.name ?: d.address; emit() }
            } } }
        act.registerReceiver(receiver, IntentFilter(BluetoothDevice.ACTION_FOUND))
        a.cancelDiscovery(); a.startDiscovery()
    }

    /** Гость Bluetooth: подключается к адресу, при обрыве повторяет. */
    @JavascriptInterface fun btJoin(address: String) = act.withBtPermissions {
        val a = bt ?: return@withBtPermissions
        closed = false
        thread {
            while (!closed) {
                try {
                    a.cancelDiscovery(); status("connecting", "Подключаюсь по Bluetooth…")
                    val s = a.getRemoteDevice(address).createRfcommSocketToServiceRecord(UUID_SOZ)
                    s.connect(); pump(s, s.inputStream, s.outputStream) {}
                } catch (e: Exception) { if (!closed) { status("connecting", "Не удалось подключиться, пробую снова…"); Thread.sleep(3000) } }
            }
        }
    }

    @JavascriptInterface fun myIp(): String {
        return try {
            java.net.NetworkInterface.getNetworkInterfaces().toList().flatMap { it.inetAddresses.toList() }
                .firstOrNull { !it.isLoopbackAddress && it is java.net.Inet4Address }?.hostAddress ?: ""
        } catch (_: Exception) { "" }
    }

    /** Хозяин в локальной сети (Wi-Fi или точка доступа одного из телефонов). */
    @JavascriptInterface fun lanHost() {
        closed = false
        thread {
            try {
                tcpServer = ServerSocket(PORT)
                registerNsd()
                while (!closed) {
                    status("waiting", "Жду соперника. Мой адрес: ${myIp()}")
                    val s = tcpServer!!.accept(); s.tcpNoDelay = true
                    pump(s, s.getInputStream(), s.getOutputStream()) {}
                }
            } catch (e: Exception) { if (!closed) status("error", "Сеть: ${e.message}") }
        }
    }

    private fun registerNsd() {
        try {
            nsd = act.getSystemService(Context.NSD_SERVICE) as NsdManager
            val info = NsdServiceInfo().apply { serviceName = "Созвездие-" + (100..999).random(); serviceType = NSD_TYPE; port = PORT }
            nsdReg = object : NsdManager.RegistrationListener {
                override fun onServiceRegistered(i: NsdServiceInfo) {}
                override fun onRegistrationFailed(i: NsdServiceInfo, e: Int) {}
                override fun onServiceUnregistered(i: NsdServiceInfo) {}
                override fun onUnregistrationFailed(i: NsdServiceInfo, e: Int) {}
            }
            nsd!!.registerService(info, NsdManager.PROTOCOL_DNS_SD, nsdReg)
        } catch (_: Exception) {}
    }

    /** Поиск игр в локальной сети: событие lanGames [{name, host}]. */
    @JavascriptInterface fun lanScan() {
        try {
            val wm = act.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            mlock = wm.createMulticastLock("soz").apply { setReferenceCounted(false); acquire() }
            nsd = act.getSystemService(Context.NSD_SERVICE) as NsdManager
            val games = LinkedHashMap<String, String>()
            nsdDisc?.let { try { nsd!!.stopServiceDiscovery(it) } catch (_: Exception) {} }
            nsdDisc = object : NsdManager.DiscoveryListener {
                override fun onDiscoveryStarted(t: String) {}
                override fun onDiscoveryStopped(t: String) {}
                override fun onStartDiscoveryFailed(t: String, e: Int) {}
                override fun onStopDiscoveryFailed(t: String, e: Int) {}
                override fun onServiceLost(i: NsdServiceInfo) {}
                override fun onServiceFound(i: NsdServiceInfo) {
                    @Suppress("DEPRECATION")
                    nsd!!.resolveService(i, object : NsdManager.ResolveListener {
                        override fun onResolveFailed(i: NsdServiceInfo, e: Int) {}
                        override fun onServiceResolved(r: NsdServiceInfo) {
                            @Suppress("DEPRECATION") val h = r.host?.hostAddress ?: return
                            games[h] = r.serviceName
                            val arr = JSONArray(); games.forEach { (k, v) -> arr.put(JSONObject().put("host", k).put("name", v)) }
                            event("lanGames", arr.toString())
                        }
                    })
                }
            }
            nsd!!.discoverServices(NSD_TYPE, NsdManager.PROTOCOL_DNS_SD, nsdDisc)
        } catch (e: Exception) { status("error", "Поиск в сети: ${e.message}") }
    }

    @JavascriptInterface fun lanJoin(host: String) {
        closed = false
        thread {
            while (!closed) {
                try {
                    status("connecting", "Подключаюсь к $host…")
                    val s = Socket(); s.connect(InetSocketAddress(host.trim(), PORT), 5000); s.tcpNoDelay = true
                    pump(s, s.getInputStream(), s.getOutputStream()) {}
                } catch (e: Exception) { if (!closed) { status("connecting", "Не удалось подключиться к $host, пробую снова…"); Thread.sleep(3000) } }
            }
        }
    }

    @JavascriptInterface fun close() {
        closed = true; out = null
        listOf(sock, btServer, tcpServer).forEach { try { it?.close() } catch (_: Exception) {} }
        try { nsdReg?.let { nsd?.unregisterService(it) } } catch (_: Exception) {}
        try { nsdDisc?.let { nsd?.stopServiceDiscovery(it) } } catch (_: Exception) {}
        nsdReg = null; nsdDisc = null
        receiver?.let { try { act.unregisterReceiver(it) } catch (_: Exception) {} }; receiver = null
        try { mlock?.release() } catch (_: Exception) {}
        try { bt?.cancelDiscovery() } catch (_: Exception) {}
        status("closed")
    }
}
