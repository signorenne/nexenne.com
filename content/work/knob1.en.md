---
title: Knob1 · firmware and LVGL HMI
lang: en
translated_from: it
auto_translated: false
client: Work Louder · Canada
role: Firmware and HMI developer
year: Since March 2026
summary: "I stabilized the Knob1 firmware and LVGL interface, improving memory use, wallpapers, battery and charging behavior, and USB/BLE communications. The product is released and remains under active maintenance, with ongoing fixes and feature updates."
tags: [ESP32, ESP-IDF, C/C++, LVGL, BLE, TinyUSB, MAX77972]
color: coral
accent: LVGL HMI · battery · reliability
metrics:
  - { k: Product, v: Knob1 }
  - { k: Scope, v: Existing firmware and HMI }
  - { k: Status, v: Complete · maintenance and updates }
---

## Many features, one balance to restore

Knob1 is a mechanical keyboard with two encoders, USB and Bluetooth connectivity, and a color display for settings, device status, timers, and custom wallpapers.

The difficult part was the balance between those systems. The display had to reflect the actual battery and connection state, while image handling could not consume memory needed by communications or key scanning. Fixing one symptom in isolation would only have moved the problem elsewhere.

![Knob1](/work/knob1/product.webp)

_Product image: [Work Louder, official Knob1 page](https://worklouder.cc/knob1)._

## Interface and memory

I began with the LVGL interface. I fixed a memory leak in wallpaper handling, reduced the temporary memory required to load images, and corrected the lifetime of graphical objects so unused resources would not remain allocated.

I also fixed cases where battery and charging information did not match the actual device state. That interpretation now happens outside individual screens, so the HMI receives a coherent state instead of deriving one from readings that may change quickly.

## Battery and MAX77972

Knob1 uses the same MAX77972 component as Creator Micro 2. I integrated the rewritten power and charging libraries into the product, working directly from the chip documentation.

The driver handles the component; the rest of the firmware decides when to enter standby, suspend features, or protect the battery. This resolved latent issues without spreading device-specific exceptions throughout the application.

## Communications

I also integrated the shared BLE, USB, and RPC libraries. Channel selection, pairing, reconnection, and communication with Input now follow the same rules as the other Work Louder products.

The benefit is not just more uniform code. Communications, power management, and the interface now depend on one common state instead of making conflicting decisions.

## What improved

- A smoother and more predictable LVGL HMI.
- The wallpaper memory leak was eliminated.
- Lower memory use while loading images.
- Battery and charging information aligned with the real device state.
- More reliable USB/BLE communications and Input synchronization.

The consolidation work is complete and Knob1 is now under maintenance. Its firmware continues to receive fixes, optimizations, and new features.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · LVGL · NimBLE · TinyUSB · MAX77972 · RPC.
