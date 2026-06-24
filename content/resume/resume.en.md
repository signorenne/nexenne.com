---
name: Nicolò Plebani
role: Software Architect
photo: /profile.jpg
accent: "#2e5266"

labels:
  subtitle: "/resume · curriculum vitae"
  title: Résumé
  download: Print or save as PDF
  born: Date of birth
  experience: Experience
  date: Date
  location: Location
  projects: Projects
  one_line: In a sentence
  skills: Technical skills
  education: Education
  languages: Languages
  awards: Awards
  off_screen: Personal interests
  consent: Privacy consent

contact:
  email: nicolo@nexenne.com
  website: nexenne.com
  github: github.com/signorenne
  phone: "+39 346 311 6428"
  location: "Bergamo, IT"
  born: "17 June 1999"

quote: |
  I am a software architect based in Bergamo, Italy. I design custom software
  solutions to control devices, simplify complex systems, and automate processes.

  I develop firmware for embedded systems, intuitive HMI, native apps, websites,
  web applications, reusable libraries, and system integrations. I can define
  the architecture of a new product or work on software already in production,
  turning goals and technical constraints into solutions that are verifiable,
  maintainable, and suited to the real context.

motto: "Do a thing well, or do not do it at all."

experience:
  - role: "Firmware Developer"
    company: Work Louder
    date: "December 2025 - Present"
    location: "Remote, Canada"
    current: true
    headline: "ESP32 firmware for keyboards and macropads with displays, with direct ownership of architecture, stability, and product continuity."
    points:
      - "Took ownership of Creator Micro 2, XYZ Work Board r2, Knob1, and Nomad [E] 2, becoming a technical reference for continuity across the ESP32 line."
      - "Built the XYZ Work Board r2 firmware from scratch starting from the PCB, turning hardware schematics, product requirements, and production constraints into a complete, verifiable solution."
      - "Drove the Creator Micro 2 and Knob1 firmware to completion and now maintain them with fixes, optimizations, and new features."
      - "Building the Nomad [E] 2 firmware and LVGL interface on its new hardware platform, also defining the product UX and improving the UI to make interactions clearer and more coherent."
      - "Rewrote shared libraries for USB/BLE communications, RPC synchronization between devices, configurator, and connected services, and power and charging management, eliminating fragile behavior and recurring issues."
    tags: [ESP32, ESP-IDF, NimBLE, TinyUSB, LVGL, UX/UI, Embedded Connectivity]

  - role: "Embedded / HMI Developer"
    company: "Re:Lab"
    date: "January 2025 - Present"
    location: "Treviglio, Italy"
    current: true
    headline: "Tractor cabin and cluster software, giving structure to machine data and making HMI components easier to integrate and validate."
    points:
      - "Collaborate with the SDF R&D team through Re:Lab, delivering hands-on contributions to tractor cabin software and onboard displays."
      - "Structured the machine-data flow by separating communication, interpretation, validation, and application state, making the system more readable and robust."
      - "Introduced a Qt-integrated hardware-abstraction library to standardize reads, writes, and events, simplifying integration with the application model."
      - "Created cluster pages and reusable QML components for indicators, controls, alarms, and popups, reducing duplication and visual inconsistencies."
      - "Work on latency, regressions, and direct validation on the reference display, improving the perceived quality of the interface."
    tags: [Automotive, HMI, Qt/QML, CAN, Driver/GPIO, Embedded Linux, Hardware integration]

  - role: "Sole Proprietor"
    company: NicoLab
    date: "October 2023 - February 2024"
    location: "Chiuduno, Italy"
    headline: "Created and managed a sole proprietorship specializing in fashion-accessory processing and finishing for third-party clients, building an autonomous and reliable service."
    points:
      - "Personally organized production around deadlines, quality standards, and client specifications, ensuring orderly deliveries and consistent results."
      - "Took direct responsibility for clients, operational priorities, unexpected issues, and non-conformities, keeping work aligned with real production needs."
      - "Managed operational, administrative, and commercial activities, developing decision-making autonomy and direct accountability for outcomes."
    tags: [Client management, Planning, Quality control, Administration, Sales]

  - role: "Craftsperson"
    company: Giosmalt
    date: "January 2019 - September 2024"
    location: "Chiuduno, Italy"
    headline: "Contributed continuously to the family craft business, supporting fashion-accessory production and finishing with attention to precision and continuity."
    points:
      - "Took ownership of operational and administrative activities across the full process, from processing to quality control and delivery, improving day-to-day coordination."
      - "Organized work during peak periods, helping maintain deadlines and quality standards under pressure."
      - "Gained practical experience managing resources, priorities, and operational responsibilities in a real production context."
    tags: [Production, Organization, Resource management, Quality control]

  - role: "IT Intern"
    company: Italtrans
    date: "June 2018 - August 2018"
    location: "Calcinate, Italy"
    headline: "Handled technical and system administration interventions for maintenance, operational continuity, and issue resolution, helping reduce workstation downtime."
    points:
      - "Supported users across departments, translating operational needs into practical IT interventions."
      - "Repaired and updated workstations, managed support tickets, and maintained company hardware, making support faster and more organized."
    tags: [IT support, Hardware, Ticketing, Internship]

  - role: "Programmer"
    company: Garmsafe
    date: "November 2016 - January 2018"
    location: "Bergamo, Italy"
    headline: "Led the software side of a simulated school-business project, bringing a concrete technical contribution in a context organized like a small company."
    points:
      - "Designed and developed software to acquire and process data from ultrasonic sensors, turning a hardware prototype into a working demonstration."
      - "Coordinated a team of four from planning to final presentation, helping achieve first place in the IFS competition."
    tags: [Arduino, Sensors, Team coordination, 3D modeling, Teamwork]

projects:
  - name: Nexenne Library
    kind: Personal · open source
    date: "2026 - Present"
    location: "Bergamo, Italy"
    current: true
    headline: "A collection of independent C++23 libraries created to turn experimental code into reusable, maintainable components."
    points:
      - "Set up a component architecture in which each module can be integrated, tested, and distributed independently, improving reuse and isolation."
      - "Building utility, container, time, and random-generation modules following standard-library conventions, making the APIs predictable."
      - "Made the project verifiable with Doctest, CMake presets, AddressSanitizer, and UndefinedBehaviorSanitizer, increasing reliability and maintainability."
      - "Bringing ideas matured in Enne 2D into a simpler, more modular, and maintainable foundation, avoiding unnecessary complexity from the original project."
    link: github.com/signorenne/nexenne
    tags: [C++23, CMake, Doctest, Agile development]

  - name: TrackOMatic
    kind: Personal · archived · open source
    date: "November 2022 - February 2023"
    location: "Chiuduno, Italy"
    headline: "Native Android app for recording, synchronizing, and analyzing outdoor activities."
    points:
      - "Conceived, designed, and developed the complete app with MVVM, Clean Architecture, and Jetpack Compose, creating a structured foundation that was easier to evolve."
      - "Integrated Google Maps, location services, and Firebase for authentication, synchronization, backend functions, and cloud storage, making the app usable end-to-end."
      - "Defined and documented user flows, architecture, and module responsibilities, giving the project a clear technical direction."
      - "Optimized GPS tracking to balance accuracy, background continuity, and battery consumption, improving the real-world user experience."
    link: github.com/signorenne/trackomatic
    tags: ["Clean Architecture", MVVM, Firebase]

skills:
  - title: Soft skills
    items: [Attention to detail, Leadership, Pragmatism, Time management, Problem solving, Critical thinking, Conflict management]
  - title: Languages
    items: [C, C++, Kotlin, Java, Python, TypeScript, Bash]
  - title: Embedded systems
    items: [ESP32, ESP-IDF, FreeRTOS, PlatformIO, Embedded Linux, Real-time systems]
  - title: HMI and applications
    items: [Qt, QML, LVGL, SDL, Jetpack Compose, SvelteKit]
  - title: Communications and integrations
    items: [UART/I²C/SPI, CAN, BLE, TCP/IP, MQTT]
  - title: Libraries and backend
    items: [Boost, fmt, spdlog, nlohmann/json, MongoDB, REST APIs, Firebase, MySQL]
  - title: Tooling
    items: [Git, CMake, Conan, Gradle, GDB, Doctest, GNU/Linux, Windows, Qt Creator, VSCode, Android Studio, IntelliJ IDEA, Org-mode, Godot Engine, Figma]

education:
  - degree: Bachelor's degree in Computer Science
    school: University of Milano-Bicocca
    date: "October 2022 - 2027 (expected)"
  - degree: Technical diploma in Computer Science
    school: "I.T.I.S. P. Paleocapa - Bergamo"
    date: "September 2013 - June 2018"

languages:
  - name: Italian
    level: Native
  - name: English
    level: B2

awards:
  - title: "IFS · 1st place"
    year: "2018"
    body: "Recognition received with Garmsafe and the BlindStrip project, presenting a working prototype developed as a team."

hobbies: [Hiking, Calisthenics, Skiing, Writing]

consent: |
  I authorize the processing of my personal data for personnel selection and
  recruiting purposes under Regulation (EU) 2016/679 (GDPR) and Italian
  Legislative Decree 196/2003, as amended by Legislative Decree 101/2018.
---
