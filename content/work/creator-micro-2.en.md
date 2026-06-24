---
title: Creator Micro 2 · firmware evolution
lang: en
translated_from: it
auto_translated: false
client: Work Louder · Canada
role: Firmware developer
year: Since December 2025
summary: "I brought order to the Creator Micro 2 ESP32 firmware by rewriting shared USB/BLE communications, Input synchronization, and battery-management libraries. The product is released and remains under active maintenance, with ongoing fixes and feature updates."
tags: [ESP32, ESP-IDF, C/C++, BLE, NimBLE, TinyUSB, RPC]
color: violet
accent: BLE/USB communications · shared libraries
metrics:
  - { k: Product, v: Creator Micro 2 }
  - { k: Scope, v: Existing firmware evolution }
  - { k: Status, v: Complete · maintenance and updates }
---

## Already in users' hands

Creator Micro 2 is a configurable macropad with keys, an encoder, a joystick, RGB lighting, and USB or Bluetooth connectivity. It also communicates with **Input**, Work Louder's desktop configurator, to synchronize profiles, actions, and data.

Creator Micro 2 was already in users' hands when I joined the project. I could not treat its firmware like a prototype: every change had to preserve existing configurations and behavior while removing the issues that made new features harder to build.

![Creator Micro 2](/work/creator-micro-2/product.webp)

_Product image: [Work Louder, official Creator Micro 2 page](https://worklouder.cc/creator-micro-2)._

## Bringing order to communications

The most delicate part of the work was rewriting the communication library shared by several Work Louder products. The previous implementation handled channel selection, pairing, reconnection, and data transmission in the same area; when events overlapped, the actual device state became hard to follow and easy to misread.

I separated those responsibilities and made USB/Bluetooth transitions explicit. The firmware now knows which connection is active, what must be disconnected, and when input transmission can resume. This removed cases where the device could remain between states or continue using the previous channel.

I also revised the BLE stack and the RPC protocol used by Input. Frequent operations now do less work, and closely spaced requests no longer depend on a perfect event order.

Because the libraries are shared, this work did not stay limited to Creator Micro 2. It became a stronger communications foundation for other devices in the product line.

## Power and charging

Creator Micro 2 uses the MAX77972 to manage battery and charging. The previous implementation had several issues and made it difficult to tell whether unexpected behavior came from the firmware or the component itself.

Instead of adding small patches around the symptoms, I went back to the datasheets and rewrote both the driver and the higher-level power logic. Access to the chip is now separate from product decisions such as interpreting battery state or responding to inconsistent readings. The result is more predictable, easier to test, and much easier to diagnose when something goes wrong.

## What improved

- More reliable switching between USB and Bluetooth.
- Pairing and reconnection behavior that is easier to manage and diagnose.
- More stable synchronization with Input.
- Shared libraries that can be reused across other products.
- Clearer, more testable battery and charging management.

The main project is complete. Creator Micro 2 is now in maintenance, with ongoing fixes, refinements, and feature updates that preserve the behavior users already rely on.

## Stack

ESP32 · ESP-IDF · FreeRTOS · C/C++ · NimBLE · TinyUSB · NVS · RPC.
