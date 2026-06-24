---
title: "Migrating to open-source apps on your phone"
lang: en
translated_from: it
auto_translated: false
date: 2024-06-29
desc: "After moving to GrapheneOS, I started replacing my main apps with more privacy-respecting alternatives."
read: "5 min"
tags: ["OSS", "Android"]
categories: ["Software", "Mobile"]
image: "/blog/covers/migrate_to_open_source_applications_on_mobile.jpg"
---
## Introduction
After moving to GrapheneOS, I decided to replace many of my apps with more privacy-respecting alternatives.
I also realized how dependent I was on applications from the major platforms.

These were the apps I used most on my old Samsung S10:

-   WhatsApp.
-   Google suite: Mail, Calendar and Drive.
-   Google Workspace suite.
-   YouTube.
-   Google Maps.
-   Google Play Store.

These were only some of the main applications I used.
In practice, a large part of my digital life went through Google, Microsoft, and Meta.

I started looking for open-source and privacy-oriented alternatives, accepting a few compromises compared with the services I used before.

## Replacing WhatsApp
This was the hardest step, not because of the app choice but because of the migration.
Today almost everyone uses WhatsApp, and for many people it has become the default channel.
I had to warn my contacts that I was moving away from it and would soon no longer be reachable there.
There were plenty of questions.
In the end I moved to Signal Messenger, and very few people followed me. That was not a big problem: anyone who needed to reach me could still call instead of sending text messages or endless voice notes.

Why Signal and not alternatives like Session, Briar, Element, or SimpleX Chat?

In short:

Contact lists on Signal are encrypted with the Signal PIN and the server has no access to them.
Personal profiles are also encrypted and only shared with the contacts you chat with.
Signal supports private groups, where the server has no record of group membership, group titles, group avatars or group attributes.
Signal has minimal metadata when Sealed Sender is enabled.
The sender address is encrypted alongside the message body and only the recipient address is visible to the server.
Sealed Sender is enabled only for people in your contact list, but it can be enabled for all recipients, at the cost of a higher risk of receiving spam.

In addition, the protocol has been independently reviewed and its specifications are public.

As a bonus, Signal's interface is very close to WhatsApp's.

## Replacing the Google suite: Mail, Calendar and Drive
These are some of the providers I evaluated, grouped by category.

Email services:

-   Proton Mail
-   Tutanota
-   Mailbox.org

Cloud storage services:

-   Proton Drive
-   Tresorit
-   Peergos

Calendar services:

-   Proton Calendar
-   Tuta (Tutanota's calendar)

The options were two: split the services across different providers or use a single company.

I chose Proton because it brings mail, calendar, and cloud storage into one service, with polished applications and a privacy-focused model.

To recap, I replaced Gmail, Google Calendar, and Google Drive with Proton Mail, Proton Calendar, and Proton Drive.

## Replacing the Google Workspace suite
Unfortunately, for this one I did not find a solid alternative.
The choice I made was to pair an excellent app, Collabora Office, for editing documents, with a good sync service, Syncthing.

That's because Collabora Online (Office) is not a standalone piece of software.
On the contrary, the online office suite plugs into an existing infrastructure and requires a cloud solution as its base (NextCloud, Dropbox, etc.).

## Replacing YouTube
I mostly use YouTube for learning, but also for entertainment.
In this case I still use Google's platform, but through a third-party client instead of the official app.

Fortunately, I did not need to do much research: I had already been using NewPipe for several years.

NewPipe is an intuitive, feature-rich and privacy-respecting app that lets you watch videos on YouTube.
The app offers many parts of the YouTube experience without invasive ads and without the permissions requested by the official app.
It is also open source and its code is available on GitHub.

## Replacing Google Maps
Here the only solution is to switch to a client based on OpenStreetMap.

The alternatives are:

-   OsmAnd
-   Organic Maps
-   Magic Earth

The first two are excellent both for browsing maps and for the features they offer; however, they fall short in real-time navigation. During navigation, they often suggest very inconvenient secondary roads or pick routes that needlessly lengthen the trip.
The third one excels where the others struggle, but its source code is not available.

I mostly use Organic Maps for its clean interface and for hiking. When I need to drive somewhere unfamiliar, I prefer Magic Earth.

## Replacing the Google Play Store
As with YouTube, one solution is to use an alternative client for the Play Store catalog.
The app I use for this is Aurora Store.
Aurora Store is a free alternative to the Google Play Store.
With this app you can download applications, update the existing ones, get details on in-app trackers, hide your location, search for applications and much more.
Aurora's developers have also done good work on the design and interface.

## Conclusion
Replacing mainstream smartphone apps requires compromises: sometimes you lose convenience, sometimes you gain control. For me the switch made sense because it reduced my dependency on major platforms without making the phone uncomfortable to use.
