---
title: XYZ Work Board r2 · from PCB to firmware
lang: en
translated_from: it
auto_translated: false
client: Work Louder · Canada
role: Firmware developer
year: Since January 2026
summary: "I turned the XYZ Work Board r2 PCB into complete ESP32 firmware, covering architecture, Input configuration, and production testing. The product is released and remains under active maintenance, with ongoing fixes and updates."
tags: [ESP32, ESP-IDF, C/C++, TinyUSB, RPC, RGB, Self-test]
color: cyan
accent: Board-up firmware · USB · self-test
metrics:
  - { k: Product, v: XYZ Work Board r2 }
  - { k: Connectivity, v: Wired USB }
  - { k: Status, v: Complete · maintenance and updates }
---

## A board that needed to become a product

XYZ Work Board r2 is a compact wired keyboard with 47 keys, an encoder, configurable layers, and lighting. Actions are customized through Input and stored on the device.

The new PCB and an initial project structure were already available, but the board still needed the firmware that would turn it into a product. Starting from the board design, component datasheets, and hardware-team specifications, I defined the software architecture and implemented the features needed for release.

![XYZ Work Board r2](/work/xyz-work-board-r2/product.webp)

_Product image: [Work Louder, official XYZ Work Board r2 page](https://worklouder.cc/xyz-work-board-2)._

## From PCB to firmware

I first reconstructed how the board worked: pins, peripherals, connections, and component constraints. I collected that knowledge in hardware-specific modules, so the keyboard logic could focus on keys, encoder input, layers, lighting, and configuration without knowing board-level details.

XYZ Work Board r2 is wired only. USB communication is implemented with TinyUSB while still going through the interface shared by the other firmware projects. This allows configuration logic to be reused without exposing USB-specific details to the rest of the application.

## Input and RPC

I implemented the RPC connection with Input, the desktop application used to configure the device. The firmware receives each change, validates it, stores it, and updates only the affected subsystem.

Protocol handling remains separate from the keyboard logic, so new options can be added without rewriting the USB path each time.

## Production self-test

I also developed a production-test mode for the keys, encoder, touch controls, and LEDs. It provides visual feedback for each item, can complete automatically, and can be started over RPC.

This gives the team a repeatable way to determine whether a fault comes from assembly, a component, or the firmware instead of relying on isolated manual checks.

## What I delivered

- Complete firmware for the new PCB.
- Key, encoder, layer, lighting, and internal-storage management.
- Device configuration through Input.
- USB communications separated from application logic.
- A dedicated production-test mode that can be repeated on every unit.

Initial development is complete and the product has been released. The firmware remains under maintenance for fixes, updates, and new features.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · TinyUSB · NVS · RPC · RGB LEDs.
