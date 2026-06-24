---
title: "GrapheneOS: my favorite smartphone operating system"
lang: en
translated_from: it
auto_translated: false
date: 2024-06-07
desc: "After months of daily use, GrapheneOS became my favorite smartphone operating system."
read: "6 min"
tags: ["OS", "Android", "Smartphone"]
categories: ["Software", "Mobile"]
image: "/blog/covers/graphene_os_as_my_daily_driver.jpeg"
---
## Introduction
In June 2023, my old Samsung Galaxy S10 died after a bad fall down the stairs.

I had already been thinking about replacing it, and I wanted a device that gave me more control, with a system designed around security and privacy.

I compared several operating systems based on the Android Open Source Project, each with different privacy and security goals.

I eventually narrowed the choice down to three alternatives: CalyxOS, LineageOS, and GrapheneOS.

After evaluating them, I chose GrapheneOS and bought an officially supported device.

Let's look at what GrapheneOS is, how it is installed, and which features convinced me.

## What is GrapheneOS? {#cos-è-grapheneos}

GrapheneOS is an operating system based on the Android Open Source Project, with many additional security and privacy features.
It is open source, officially supports all the most recent Google Pixel devices, and can be installed with great ease to replace the operating system on a Google Pixel.

By default it includes neither Google applications nor Google services: it essentially breaks the control Google has over the mobile device.

The result is a spartan device, in the positive sense: only stock applications from the AOSP project, everything to be configured by you, with no constraints imposed by third parties.

## How do you install GrapheneOS?
The project provides a minimal web interface that lets you install the operating system by following clear instructions.

To get started, open the [official installation guide](https://grapheneos.org/install/) and choose between the WebUSB-based installation and the classic terminal-based one.

After that, just follow the step-by-step guide.

## Some GrapheneOS features {#alcune-funzionalità-di-grapheneos}

What follows is a non-exhaustive overview of GrapheneOS features. For details, see the [official features page](https://grapheneos.org/features).

### Protection against zero-day vulnerabilities, plus extra user and network features. {#protezione-contro-le-vulnerabilità-zero-day-oltre-a-funzionalità-aggiuntive-per-utenti-e-rete-dot}

GrapheneOS protects its users from zero-day vulnerabilities.
To achieve this, GrapheneOS reduces the attack surface by removing unnecessary code from the operating system.

For app management, GrapheneOS includes dedicated toggles for network and sensor permissions, which are rare on AOSP-based custom ROMs.

At the network level, the operating system supports MAC randomization for every connection and an LTE-only mode to reduce the network attack surface by disabling legacy code (2G, 3G) and bleeding-edge code (5G).
Wi-Fi and Bluetooth (as well as the mobile hotspot) support automatic shutdown if they are not connected to a device, saving battery life and preventing potential wireless attacks from outside.

A notable feature is the private screenshot function that disables the inclusion of sensitive metadata.

### Sandboxing and memory-corruption protection.
To significantly reduce operating system vulnerabilities, the team behind GrapheneOS dedicates significant resources to the development of memory-safe languages and libraries, static and dynamic analysis tools and much more.

GrapheneOS applies sandboxing at multiple levels, hardening both the kernel and the operating system components.
In short, every element of the operating system is isolated in its own compartment, allowing app permissions and processes to remain separate and protecting them from malware and other potential security threats.

### The applications
GrapheneOS provides a set of hardened applications designed to reduce permissions and attack surface.

First, there is the WebViewer and the Vanadium browser.
Vanadium is a hardened Chromium-based browser with additional security and privacy measures.

Secure Camera, built by the GrapheneOS team, is the system's default camera. It includes the usual camera features and adds privacy and security options, such as QR scanning without network or media-access permissions and optional EXIF metadata removal from photos and videos.

Auditor provides hardware-based attestation for the device's software and firmware. It is a specialized feature, especially useful for people exposed to targeted risks.

Last but not least is Secure PDF Viewer, another application built by the GrapheneOS team. It is a PDF reader that requires no permissions and runs in a sandbox.

### Improved profile management
GrapheneOS has improved the user-profile functionality and is improving monitoring across profiles.

In detail, it gives you the ability to:

-   Add multiple profiles.
-   End the session.
-   Disable app installs in specific profiles.
-   Install available apps from one profile into another.
-   Forward notifications from inactive profiles to the current session.

### Google in a sandbox
Google apps can be installed on GrapheneOS through a dedicated compatibility layer.
The apps are stripped of the special access or privileges they would normally have.
You can use Google's applications and services, but they will be reshaped to meet high privacy and security standards.

## Conclusion
I have been using GrapheneOS for about a year, and the experience has been positive. Privacy-focused products often require significant usability compromises; in this case, the impact on everyday use stayed limited.

I did not have to radically change how I use my phone. The most annoying part was replacing many applications tied to the Google ecosystem, which deserves its own post.

The main limitation concerns apps that depend on Google Play services. Without installing the dedicated compatibility layer, some features, such as Firebase-based push notifications, may not be available.

Overall, I ended up with a phone that is more controllable, more privacy-oriented, and still comfortable for daily use.
