plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
val apiBaseUrl = providers.gradleProperty("KHANA_API_BASE_URL").getOrElse("http://10.0.2.2:3000")
val releaseApiBaseUrl = providers.gradleProperty("KHANA_RELEASE_API_BASE_URL").getOrElse("https://api.khanakarlo.com")
val googleServerClientId = providers.gradleProperty("GOOGLE_SERVER_CLIENT_ID").getOrElse("")
require(releaseApiBaseUrl.startsWith("https://")) { "KHANA_RELEASE_API_BASE_URL must use HTTPS." }
android {
    namespace = "pk.khanakarlo.mobile"
    compileSdk = 35
    defaultConfig { applicationId = "pk.khanakarlo.mobile"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
    buildFeatures { compose = true; buildConfig = true }
    defaultConfig { buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"$googleServerClientId\"") }
    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrl\"")
            manifestPlaceholders["allowCleartextTraffic"] = "true"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"))
            buildConfigField("String", "API_BASE_URL", "\"$releaseApiBaseUrl\"")
            manifestPlaceholders["allowCleartextTraffic"] = "false"
        }
    }
}
dependencies {
    implementation(project(":core:auth"))
    implementation(project(":core:network"))
    implementation(project(":core:design"))
    implementation(project(":feature:customer"))
    implementation(project(":feature:merchant"))
    implementation(project(":feature:rider"))
    implementation(platform("androidx.compose:compose-bom:2025.08.00"))
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.1")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
