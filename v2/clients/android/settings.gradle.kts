pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "KhanaKarLo"
include(":app", ":core:network", ":core:auth", ":core:design", ":feature:customer", ":feature:merchant", ":feature:rider")
