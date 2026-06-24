---
title: "Auto-updates straight from the source"
lang: en
translated_from: it
auto_translated: false
date: 2024-07-13
desc: "How I use Obtainium to update open-source Android apps directly from their official sources."
read: "5 min"
tags: ["OSS", "Android"]
categories: ["Software", "Mobile"]
image: "/blog/covers/autoupdate_your_android_foss_apps_directly_from_source.jpg"
---
## Introduction
F-Droid is often recommended by security and privacy enthusiasts, and I imagine that many people use it to download, install and update their favorite apps on their phones.
I used F-Droid for a long time too, but after reading [PrivSec's article](https://privsec.dev/posts/android/f-droid-security-issues/) on its security issues, I decided to look for an alternative.

At first I used RSS feeds to follow the updates of the applications I was interested in.
I would download the app directly from the developer's GitHub or GitLab page, subscribe to the RSS feed and wait for the update notifications.
When a new release came out I would go back to the dedicated page, download the APK and manually install the update.
Soon, however, I realized it was a clunky, slow and tiresome process.

I needed something that could do the same job automatically after the initial setup. The solution I chose was `Obtainium`.

## What is Obtainium? {#cos-è-obtainium}

Obtainium automates the download and installation of Android app updates directly from source websites, meaning sites where the APK files are available for direct download.

## How to get Obtainium
To install Obtainium, start from its [official GitHub page](https://github.com/ImranR98/Obtainium).

Under "Installation", select "Get it on GitHub", expand the assets, and pick the APK variant for your device. For a Google Pixel, for example, the variant is usually `app-arm64-v8a`.
The download will start, then proceed with the install as usual.
Once the install is finished, you can open the app. I recommend allowing notifications: they are handled locally and do not require Google Play services.

## The interface
When I first opened Obtainium I was pleasantly surprised by the design.

The project changes often, so names and screen layout may differ over time, but the overall flow should remain similar.

The app has a bottom navigation with these entries:

-   Apps, the full list of apps added to Obtainium.
-   Add App, to register a new app to track.
-   Import/Export, to import or export the app list and Obtainium configuration.
-   Settings, to configure the application.

## Adding an app
To add a new application, tap "Add App".
At the bottom there is a button to see the supported sources. Some, like GitHub and Codeberg, are flagged as searchable: in those cases you can search directly from Obtainium.
There are two text fields: in the first you can paste the source URL of the app you want to add; the second lets you search for it by a text string.

In this case, let's search for NewPipe since the project is on GitHub. The search may return many results, especially for a popular project; in my case, the first one was the official NewPipe repository.
For safety, I always suggest verifying that the project is the right one; even better, look up the page in your browser and paste the URL manually.

Once the source is validated, you can select it by tapping "Select".

A separate section appears with additional options. The most important ones are:

-   Include prereleases: enable this only if you want preview versions that may be unstable.
-   Fallback to older releases: useful when GitHub releases are not organized cleanly. For example, if iOS and Android builds are published as separate releases and the iOS one is newer, Obtainium may otherwise find no Android APK to install.
-   Filter Release Titles by Regular Expression: to filter release titles by a regular expression. It's an edge case, but it can happen that the URL points to multiple downloadable applications.
-   Track Only: track only, with no automatic updates. I leave this option off, since I want Obtainium to download the APKs for me so they can be installed automatically.

Now you can tap "Add". The APK is downloaded to your device; once the download is complete, Obtainium shows the details of the newly added app.
Tapping "Install" asks Android to allow app installation from Obtainium as an unknown source. Enable it and install the app.

After the installation is finished, going back to the app list you can see that NewPipe is now monitored, with the latest version correctly installed.

It sounds like a long process, but once you know the basic steps it takes only a few seconds.

## What if Obtainium were compromised by malware?
As always, you should be skeptical about everything you download from the web, open source or not.
An extra precaution is to install the first version manually from the official source and add it to Obtainium only afterwards. Android accepts updates only when the signature matches the app already installed, so an APK signed with a different key would be rejected.

## Limitations
There are some limitations to keep in mind.
The first is that app installs happen asynchronously and you cannot directly determine the success or failure of an installation.
This means that install state and versions are not synced with the operating system until the next launch or until the issue is fixed manually.
In short, you have to restart the application.

The second is that for some sources, data is gathered through web scraping, which can easily break due to changes in the website design.
Anyone who has used NewPipe will have noticed that, on every change in YouTube's interface, NewPipe's extractor is at risk of breaking and may no longer be able to extract fundamental data.
Something similar can happen with Obtainium: it's a consequence of the fragile nature of web scraping.

## Conclusion
Obtainium lets you follow updates directly from official sources and reduces the manual work needed to download new releases. It still requires care when choosing repositories and does not remove the risks of APK distribution, but it is a good compromise for managing open-source apps outside traditional stores.
