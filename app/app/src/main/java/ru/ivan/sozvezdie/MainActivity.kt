package ru.ivan.sozvezdie

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.webkit.WebChromeClient
import android.webkit.WebView

class MainActivity : Activity() {
    lateinit var web: WebView
    lateinit var net: NetBridge
    var pendingPerm: (() -> Unit)? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = Color.parseColor("#0B1026")
        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#0B1026"))
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.webChromeClient = WebChromeClient()
        net = NetBridge(this)
        web.addJavascriptInterface(net, "AndroidNet")
        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")
    }

    fun js(code: String) = runOnUiThread { web.evaluateJavascript(code, null) }

    /** Запрос разрешений Bluetooth (Android 12+: CONNECT/SCAN/ADVERTISE, раньше — геолокация). */
    fun withBtPermissions(then: () -> Unit) {
        val need = if (Build.VERSION.SDK_INT >= 31)
            arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN, Manifest.permission.BLUETOOTH_ADVERTISE)
        else arrayOf(Manifest.permission.ACCESS_FINE_LOCATION)
        val missing = need.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (missing.isEmpty()) then() else { pendingPerm = then; requestPermissions(missing.toTypedArray(), 7) }
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<out String>, res: IntArray) {
        if (code == 7) {
            if (res.isNotEmpty() && res.all { it == PackageManager.PERMISSION_GRANTED }) pendingPerm?.invoke()
            else net.status("error", "Нет разрешения на Bluetooth. Разреши «Устройства поблизости» в настройках приложения.")
            pendingPerm = null
        }
    }

    @Deprecated("back")
    override fun onBackPressed() { web.evaluateJavascript("window.onBack && window.onBack()") { r -> if (r != "true") finish() } }

    override fun onDestroy() { net.close(); super.onDestroy() }
}
