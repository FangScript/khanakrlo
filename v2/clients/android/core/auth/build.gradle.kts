plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "pk.khanakarlo.core.auth"
    compileSdk = 35
    defaultConfig { minSdk = 26 }
}
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation(project(":core:network"))
}
