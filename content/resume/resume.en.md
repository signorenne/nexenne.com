---
name: Nicolò Plebani
role: Software Architect
photo: /profile.jpg
accent: "#2e5266"

labels:
  subtitle: "/resume · curriculum vitae"
  title: Resume
  download: Print or save as PDF
  born: Date of birth
  experience: Professional Experience
  date: Period
  location: Location
  projects: Projects
  one_line: In one sentence
  skills: Technical Skills
  education: Education
  languages: Languages
  awards: Awards
  off_screen: Personal interests
  consent: Privacy consent
  ats:
    title: ATS resume
    link: ATS version
    back: Back to the full resume
    summary: Professional Summary
    experience: Work Experience
    projects: Projects
    skills: Skills
    education: Education
    languages: Languages
    awards: Awards
    tags: Key skills

contact:
  email: nicolo@nexenne.com
  website: nexenne.com
  github: github.com/signorenne
  phone: "+39 346 311 6428"
  location: "Bergamo, Italy"
  born: "June 17, 1999"

quote: |
  I am a Software Architect. I design firmware, embedded systems, HMIs, native and
  web applications, libraries, and integrations, turning product requirements and
  hardware constraints into software solutions by defining components,
  responsibilities, abstractions, APIs, protocols, and system flows.

  I work across the technical lifecycle, from architecture and implementation to
  integration and validation on real hardware, making decisions around memory,
  latency, responsiveness, power consumption, and reliability. My core stack is
  C/C++, Qt/QML, real-time systems, Embedded Linux, and communication protocols.

motto: "If something is worth doing, it is worth doing well."

experience:
  - role: "Firmware Developer"
    company: Work Louder
    date: "December 2025 - present"
    location: "Remote, Canada"
    current: true
    headline: "Develop firmware and HMIs for programmable embedded devices, working across software architecture, hardware integration, and product validation on products including Creator Micro 2, XYZ Work Board r2, Knob1, and Nomad [E] 2."
    points:
      - "Define firmware architecture from product requirements, organizing abstractions, component responsibilities, resource ownership, tasks, and communication between subsystems."
      - "Design and implement APIs, protocols, and message formats for communication between firmware, peripherals, interfaces, and services."
      - "For Codex Micro, contributed to the firmware architecture and core logic, working on system abstractions, input handling, LED feedback, and RPC integration."
      - "For Framer F1, contribute to the evolution of the existing firmware and HMI architecture, completing features and resolving hardware/software integration issues."
      - "Make design decisions around RAM, flash, latency, responsiveness, power consumption, and reliability, following features from technical design through debugging and validation on real hardware."
    tags:
      [
        Software Architecture,
        Embedded firmware,
        C/C++,
        API Design,
        Protocols,
        RPC,
        HMI,
        Hardware/software integration,
        Validation
      ]

  - role: "Embedded Software / HMI Developer"
    company: "Re:Lab"
    date: "January 2025 - present"
    location: "Treviglio, Italy"
    current: true
    headline: "Develop embedded software and HMIs for in-vehicle systems, translating functional requirements and machine data into software components and integrated user interactions."
    points:
      - "Collaborate, through Re:Lab, with the SDF R&D team on tractor cabin software and in-vehicle displays."
      - "Start from functional requirements and contribute to the technical solution by structuring the components, states, flows, and logic required by each feature."
      - "Design and develop Qt/QML components and integrate them with the embedded system and machine data."
      - "Manage assigned features from requirement analysis through validation on the target platform, taking part in code reviews and resolving integration issues with a multidisciplinary team."
    tags:
      [
        Embedded software,
        Qt/QML,
        HMI,
        Software Design,
        System Integration,
        Code Review,
        Validation
      ]

  - role: "Founder / Artisan"
    company: NicoLab
    date: "October 2023 - February 2024"
    location: "Chiuduno, Italy"
    headline: "Founded and managed a sole proprietorship specializing in the processing and finishing of fashion accessories for third-party clients."
    points:
      - "Managed clients, planning, deadlines, quality, and operational priorities, taking direct responsibility for final results."
      - "Handled operational, administrative, and commercial activities and independently managed unexpected issues and non-conformities."
    tags: [Client management, Planning, Quality control, Administration]

  - role: "Artisan"
    company: Giosmalt
    date: "January 2019 - September 2024"
    location: "Chiuduno, Italy"
    headline: "Worked in the family business, contributing to production and day-to-day operations."
    points:
      - "Handled production, quality control, delivery planning, and administrative activities."
      - "Managed priorities, resources, and unexpected issues in a real production environment, developing autonomy and operational responsibility."
    tags: [Production, Organization, Resource management, Quality control]

  - role: "IT Intern"
    company: Italtrans
    date: "June 2018 - August 2018"
    location: "Calcinate, Italy"
    headline: "Provided technical and system support to internal users and maintained company workstations."
    points:
      - "Handled user support, tickets, workstation upgrades, and hardware maintenance."
    tags: [IT support, Hardware, Ticketing, Internship]

  - role: "Programmer"
    company: Garmsafe
    date: "November 2016 - January 2018"
    location: "Bergamo, Italy"
    headline: "Led software development for a simulated training enterprise project, turning a hardware prototype into a working demonstration."
    points:
      - "Designed and developed software to acquire and process data from ultrasonic sensors."
      - "Coordinated a team of four through the final presentation, contributing to a first-place finish in the IFS competition."
    tags: [Arduino, Sensors, Coordination, Teamwork]

projects:
  - name: Nexenne Library
    kind: Personal · open source
    date: "2026 - present"
    location: "Bergamo, Italy"
    current: true
    headline: "A modular collection of independent C++23 libraries designed to turn experimental code into reusable, testable, and maintainable components."
    points:
      - "Designed a modular architecture of independent components, defining responsibilities and dependencies to improve isolation, testability, and independent evolution."
      - "Define APIs and contracts between modules following C++ standard library conventions, reducing coupling and keeping behavior predictable."
      - "Develop modules for utilities, containers, time handling, and random generation with a focus on type safety, reuse, and ease of integration."
      - "Use Doctest, CMake, AddressSanitizer, and UndefinedBehaviorSanitizer for testing, regression detection, and correctness checks."
    link: github.com/signorenne/nexenne
    tags: [C++23, Software Architecture, API Design, CMake, Doctest]

  - name: TrackOMatic
    kind: Personal · archived · open source
    date: "November 2022 - February 2023"
    location: "Chiuduno, Italy"
    headline: "A native Android application for recording, synchronizing, and analyzing outdoor activities, developed from architecture to user experience."
    points:
      - "Designed and developed the entire application using MVVM, Clean Architecture, and Jetpack Compose."
      - "Integrated Google Maps, location services, and Firebase for authentication, synchronization, backend features, and cloud storage."
      - "Defined user flows, architecture, and module responsibilities, maintaining clear separation between application layers."
      - "Optimized GPS tracking to balance accuracy, background continuity, and power consumption during real-world use."
    link: github.com/signorenne/trackomatic
    tags: ["Clean Architecture", MVVM, Firebase, Kotlin, Android]

skills:
  - title: Software architecture and system design
    items:
      [
        Component decomposition,
        Responsibility and ownership definition,
        Abstraction and API design,
        Protocol architecture,
        Event-driven systems,
        State and flow modeling,
        Real-time task organization,
        Hardware abstraction,
        Hardware/software integration,
        Resource-constrained design
      ]
  - title: Programming languages
    items: [C, C++20/23, Kotlin, Java, Python, TypeScript, Bash]
  - title: Modern C++ and libraries
    items:
      [
        STL,
        Templates and generic programming,
        C++20 Concepts,
        Ranges and views,
        RAII and ownership,
        Strong types and type safety,
        Boost,
        fmt,
        spdlog,
        nlohmann/json
      ]
  - title: Firmware and embedded systems
    items:
      [
        ESP32,
        ESP-IDF,
        FreeRTOS,
        PlatformIO,
        Embedded Linux,
        Real-time systems,
        Inputs and peripherals,
        Power and battery management
      ]
  - title: HMI, graphics, and applications
    items:
      [
        Qt,
        QML,
        LVGL,
        SDL,
        OpenGL,
        GLSL,
        Android,
        Jetpack Compose,
        Coroutines and Flow,
        Dagger Hilt,
        Google Maps
      ]
  - title: Interfaces and protocols
    items:
      [
        USB Device,
        HID,
        CDC,
        TinyUSB,
        UART,
        I²C,
        SPI,
        CAN,
        CAN FD,
        DBC,
        BLE/GATT,
        NimBLE,
        TCP/IP,
        MQTT,
        RPC,
        Framing and serialization,
        CRC and error detection
      ]
  - title: Web, backend, and data
    items: [SvelteKit, REST APIs, Firebase, MongoDB, MySQL]
  - title: Systems and networking
    items:
      [
        GNU/Linux,
        System administration,
        nftables,
        iptables,
        WireGuard,
        Package management
      ]
  - title: Toolchain, testing, and quality
    items:
      [
        Git,
        GitHub Actions,
        CMake,
        Conan,
        Gradle,
        GDB,
        Doctest,
        Doxygen,
        AddressSanitizer,
        UndefinedBehaviorSanitizer,
        Target hardware testing,
        Code review
      ]
  - title: Professional approach
    items:
      [
        Technical autonomy,
        Attention to detail,
        Pragmatism,
        Problem solving,
        Critical thinking,
        Priority management,
        Leadership,
        Technical communication
      ]

education:
  - degree: Bachelor's Degree in Computer Science
    school: University of Milano-Bicocca
    date: "October 2022 - 2027 (expected)"
  - degree: Technical High School Diploma in Computer Science
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
    body: "First-place award earned with Garmsafe and the BlindStrip project by presenting a working prototype developed as a team."

hobbies: [Hiking, Calisthenics, Skiing, Writing]

consent: |
  I authorize the processing of my personal data for recruitment and personnel
  selection purposes in accordance with Regulation (EU) 2016/679 (GDPR) and
  Italian Legislative Decree 196/2003, as amended by Legislative Decree 101/2018.
---
