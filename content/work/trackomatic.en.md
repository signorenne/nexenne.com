---
title: TrackOMatic · Android outdoor activity tracker
lang: en
translated_from: it
auto_translated: false
client: Personal · archived project
role: Designer & engineer
year: Nov 2022–Feb 2023
summary: "I designed and built a native Android app for recording outdoor activities, using Kotlin, Jetpack Compose, MVVM, Google Maps, Play Services Location, and Firebase. The project is complete and archived."
tags: [Android, Kotlin, Jetpack Compose, Firebase, MVVM, Dagger Hilt, Google Maps, Coroutines]
color: cyan
accent: Native Android · battery-aware tracking
metrics:
  - { k: Repo, v: github.com/signorenne/trackomatic }
  - { k: Stack, v: Kotlin · Jetpack Compose }
  - { k: Status, v: Complete · archived }
---

## The situation

I built TrackOMatic as a personal Android project to bring together areas that are often learned in isolation: UI, architecture, live location, authentication, and a backend. I wanted an app that could record hikes and runs, show the route on a map, and let the user start or stop tracking without digging through menus.

The interesting part was not inventing a new feature. It was making a familiar one behave well. The route had to be accurate enough to be useful without treating the phone like a lab GPS. The architecture also had to stay readable once permissions, background services, remote data, and UI state started crossing paths.

The code lives at [github.com/signorenne/trackomatic](https://github.com/signorenne/trackomatic).

![TrackOMatic tracking screen showing the live map, polyline and timer](/work/trackomatic/tom_screen.png)

## What the app does

TrackOMatic is a self-contained tracker with cloud sync. The user signs in, opens the tracking screen and starts a session. The map shows the current position and the polyline as it grows in real time; the bottom panel keeps the main stats visible. When the user stops, the app opens a save dialog with the session summary: average speed, distance, duration and estimated calories. The saved session then appears in a personal history, sortable by date, with a route image as its thumbnail.

Stats roll up into a profile screen, so the user can read recent activity trends without opening every session one by one. Settings cover the map style, measurement system and the profile data used by the calorie calculation.

## Architecture

I used MVVM with clean architecture, three layers and a clear dependency direction: **presentation → domain → data**. ViewModels go through use cases instead of reaching into repositories directly. Each repository call returns a sealed `Response<T>` (`Loading | Success | Failure`), so the UI handles loading, success and failure consistently. Updates arrive through `StateFlow`; interface actions are modeled as sealed `UIEvent` classes. Dagger Hilt wires the dependency graph.

![High-level architecture diagram of TrackOMatic](/work/trackomatic/plantuml-z3a0B9.png)

Navigation is split into four graphs (`Root`, `Launch`, `Auth`, `Main`) to keep bootstrap, authentication and the main app separate. That leaves `MainActivity` as a thin host and lets screens evolve without dragging the whole startup flow with them.

## Backend (Firebase)

The backend runs entirely on Firebase. I kept four responsibilities separate:

- **Auth**: email and password sign-in, account verification and Google One-Tap. Account deletion also revokes the Google token.
- **Firestore**: four collections keyed by `userID`: `users`, `profiles`, `settings`, `sessions`. Reads arrive through Kotlin `Flow`, so Firestore changes appear on screen without a manual refresh.
- **Storage**: each saved session stores a polyline image under the user's namespace, used as the thumbnail in the history list.
- **Functions**: when an account is deleted, a cloud function cleans up Firestore and Storage so orphaned data is not left behind.

I did not put `users`, `profiles`, and `settings` into one document because they have different update frequencies and access rules. Settings may change often; profile data feeds the calorie calculation and changes rarely; `users` mirrors Auth and is read-only from the app. Splitting them made read patterns, security rules, and write operations easier to reason about.

## Tracking pipeline

Location updates flow through a small cold Flow pipeline:

```
FusedLocationProvider → SharedLocationManager → TrackingDataSource → TrackingRepository
```

`SharedLocationManager` wraps the fused location client and exposes a Flow that emits each new fix. `TrackingDataSource` keeps the current session in memory: last position, full polyline and elapsed milliseconds. `TrackingRepository` exposes that data as `MutableStateFlow`, so interested screens can update reactively.

A `LifecycleService` called `TrackingServices` observes the repository in the background. When tracking is `STARTED` and a new position arrives, the service appends it to the active session. A foreground `NotificationHelper` keeps the session visible in the notification shade and reduces the chance that Android stops the service after the app moves to the background.

The fused provider runs in high-accuracy mode, with intervals between 2 and 5 seconds. It is a compromise: frequent enough to draw a believable polyline, careful enough not to waste battery for no benefit.

`ToMViewModel` is the one place where I access the tracking repository directly instead of going through a use case. That was intentional: the live screen needs the raw `StateFlow`s for position, polyline, state, and elapsed time, and an extra layer would not have made the code clearer. Everywhere else, the separation stays stricter.

![Live tracking with save dialog showing the route and stats](/work/trackomatic/tom_dialog.png)

## UI

The UI is built in Jetpack Compose, with eight screens and a `BottomBar` scaffold for the main part of the app.

- `InitScreen`: splash that routes to `Auth` or `Main` based on session state.
- `SignInScreen`, `SignUpScreen`, `RestoreScreen`, `VerifyScreen`: sign-in, registration, password recovery and account verification, plus Google One-Tap.
- `HomeScreen`: history list with the route thumbnails. Tapping a row opens the `StatisticsDialog` with full per-session stats.
- `ToMScreen`: the live tracking screen.
- `ProfileScreen`: aggregate stats with a timeline chart.
- `SettingsScreen`: map style, metric system, profile edit, logout, account deletion.

Each screen has its own sealed `UIState` and `UIEvent`, validated in the ViewModel before they reach the composables. That way composables receive checked data and previews are easier to build.

![Session history with route thumbnails](/work/trackomatic/home_screen.png)

![Aggregate stats and per-session timeline](/work/trackomatic/profile_screen.png)

## What I learned

Battery life is part of the user experience. A tracker can feel excellent in the first five minutes and become a problem after an afternoon of real use. The best solution was not the most aggressive one, but the more measured approach: sampling tied to motion, clearer ownership between the service and ViewModel, and a route accurate enough without pretending the phone was a lab instrument.

Clean Architecture paid off, but it came with trade-offs. The `ToMViewModel` exception, where the live screen accesses the tracking repository directly, reminded me that architecture should make the app easier to understand, not exist only to satisfy a diagram.

The other lesson concerned the scope of the project. When you build a complete save flow with a cloud backend and account deletion, weak abstractions quickly become obvious. Mock data hides many bugs. A `Functions`-driven cascade delete can look excessive until you consider a user who genuinely wants their data removed; at that point, it becomes part of the product.

## Project status

TrackOMatic is complete and archived. The repository remains available as a full case study of a native Android app with background tracking, layered architecture and a cloud backend, but it no longer has an active development roadmap.

## Links

- Source: [github.com/signorenne/trackomatic](https://github.com/signorenne/trackomatic)
