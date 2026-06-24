---
title: Nomad [E] 2 · firmware and LVGL HMI
lang: en
translated_from: it
auto_translated: false
client: Work Louder · Canada
role: Firmware and HMI developer
year: Since March 2026 · in development
summary: "I am building the firmware and LVGL interface for the new Nomad [E] 2 ESP32 platform, turning PCB documentation, datasheets, and requirements into drivers, product features, communications, and HMI."
tags: [ESP32, ESP-IDF, C/C++, LVGL, BLE, TinyUSB, RPC]
color: lime
accent: New platform · drivers · LVGL HMI
metrics:
  - { k: Product, v: "Nomad [E] 2" }
  - { k: Scope, v: New-platform firmware and HMI }
  - { k: Status, v: Active development }
---

## A new platform to build

Nomad [E] 2 is a mechanical keyboard with a color display, encoders, lighting, USB/Bluetooth connectivity, and features configured through Input.

The project began with a new PCB and an initial software structure. My role is to turn that foundation into product firmware: studying the board and datasheets, defining module boundaries, and developing both the hardware-facing code and the user interface.

![Nomad [E] 2](/work/nomad-e-2/product.webp)

_Product image: [Work Louder, official Nomad [E] 2 page](https://worklouder.cc/nomad-e-2)._

## Hardware and core behavior

I wrote drivers for the display, encoders, I/O expanders, LEDs, buzzer, and power system. Each component has a dedicated module, so the rest of the firmware does not need to know its registers, communication details, or device-specific behavior.

On top of those drivers, I am building key scanning, command configuration, lighting, telemetry, and power management. USB and Bluetooth communications and the RPC connection with Input are part of the same architecture instead of being bolted on as separate layers.

## LVGL HMI

The display is more than a status indicator: it brings together configuration, device state, and everyday features. I am developing screens for initial setup, battery and charging, channel selection, lighting, media controls, a Pomodoro timer, wallpapers, and settings.

Navigation is centralized so individual screens do not interpret encoder and shortcut input differently. Common actions are routed to the active screen, keeping behavior consistent as new features are introduced.

Graphics memory is limited on the target, so object lifetimes are controlled and wallpapers are loaded in smaller chunks. This keeps the interface responsive without taking resources away from communications or keyboard behavior.

## Input and device behavior

Input communicates with the firmware over RPC to modify configuration, lighting, and other settings. Each request is validated and routed to the relevant module, keeping protocol handling, persistence, and interface updates separate.

The HMI and power management also read the same device state, so charging, standby, and wake-up can be represented consistently.

## Current status

- Firmware architecture defined for the new ESP32 platform.
- Dedicated drivers for the board peripherals.
- LVGL navigation and the first integrated product features.
- USB and Bluetooth connectivity.
- Configuration and synchronization through Input.
- Memory management designed around the device's resource constraints.

Nomad [E] 2 is still in active development. Its firmware, interface, and product features continue to evolve alongside the hardware platform, with the goal of reaching release on a foundation that is already structured and maintainable.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · LVGL · NimBLE · TinyUSB · NVS · RPC.
