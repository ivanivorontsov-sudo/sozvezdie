import java.util.Properties
plugins { alias(libs.plugins.android.application); alias(libs.plugins.jetbrains.kotlin.android) }
android {
    namespace = "ru.ivan.sozvezdie"
    compileSdk = 36
    defaultConfig { applicationId = "ru.ivan.sozvezdie"; minSdk = 24; targetSdk = 36; versionCode = 1; versionName = "1.0.0" }
    val signProps = Properties().apply {
        val f = file(System.getenv("SOZ_SIGNING") ?: "/workspace/keys/sozvezdie/signing.properties")
        if (f.exists()) f.inputStream().use { load(it) }
    }
    signingConfigs { create("release") { if (signProps.isNotEmpty()) {
        storeFile = file(signProps.getProperty("storeFile")); storePassword = signProps.getProperty("storePassword")
        keyAlias = signProps.getProperty("keyAlias"); keyPassword = signProps.getProperty("keyPassword") } } }
    buildTypes { release { if (signProps.isNotEmpty()) signingConfig = signingConfigs.getByName("release"); isMinifyEnabled = false } }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
kotlin { jvmToolchain(17) }
