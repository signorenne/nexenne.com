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
  experience: Experience
  date: Period
  location: Location
  projects: Projects
  one_line: In one sentence
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
  location: "Bergamo, Italy"
  born: "June 17, 1999"

quote: |
  I am a software architect based in Bergamo, Italy.
  I design firmware, HMIs, native and web applications, libraries, and
  integrations for connected products, turning product requirements and hardware
  constraints into reliable, maintainable, and easy-to-use systems.

  I work across the full development process, from architecture to integration
  on real hardware: defining components, flows, and protocols; implementing
  features; connecting interfaces, peripherals, services, and communication
  systems; and validating final behavior on the product. I work both on new
  platforms and on software already in production, with a pragmatic approach
  grounded in testing, validation, and code quality.

motto: "If something is worth doing, it is worth doing well."

experience:
  - role: "Firmware Developer"
    company: Work Louder
    date: "December 2025 - present"
    location: "Remote, Canada"
    current: true
    headline: "Develop firmware, HMIs, and product experiences for programmable keyboards and controllers, including Codex Micro and Framer F1 through Work Louder's collaborations with OpenAI and Framer."
    points:
      - "Develop and maintain firmware across Work Louder products, integrating inputs, displays, LEDs, communications, and application logic."
      - "For Codex Micro, worked on the firmware architecture and core logic, including input handling, LED feedback, and RPC calls."
      - "For Framer F1, work on the firmware and HMI, coordinating the display, keys, encoders, and product features into a consistent experience."
      - "Continue the development of Creator Micro 2, XYZ Work Board r2, Knob1, and Nomad [E] 2 through implementation, testing, validation, and product refinement."
    tags: [Embedded firmware, UX/UI, Product UX, HMI, Product integration, Validation]

  - role: "Embedded Software / HMI Developer"
    company: "Re:Lab"
    date: "January 2025 - present"
    location: "Treviglio, Italy"
    current: true
    headline: "Develop embedded software and HMIs for in-vehicle displays, translating functional requirements and machine data into clear interfaces for operators."
    points:
      - "Collaborate, through Re:Lab, with the SDF R&D team on tractor cabin software and in-vehicle displays."
      - "Translate product requirements and machine data into software components, pages, indicators, and interaction logic consistent with the instrument cluster."
      - "Develop and integrate Qt/QML interfaces while maintaining visual and behavioral consistency across features."
      - "Validate functionality on the target platform and refine the result with a multidisciplinary team, balancing technical constraints, readability, and usability."
    tags: [Embedded software, HMI, Qt/QML, Product integration, Validation]

  - role: "Artisan"
    company: NicoLab
    date: "October 2023 - February 2024"
    location: "Chiuduno, Italy"
    headline: "Founded and managed a sole proprietorship specializing in the processing and finishing of fashion accessories for third-party clients."
    points:
      - "Planned and coordinated production activities according to deadlines, client specifications, and quality standards."
      - "Managed clients, operational priorities, unexpected issues, and non-conformities while keeping production aligned with actual requirements."
      - "Handled operational, administrative, and commercial activities, taking direct responsibility for organization and final results."
    tags: [Client management, Planning, Quality control, Administration, Sales]

  - role: "Artisan"
    company: Giosmalt
    date: "January 2019 - September 2024"
    location: "Chiuduno, Italy"
    headline: "Worked in the family business, contributing to the production and finishing of fashion accessories and to day-to-day operations."
    points:
      - "Handled operational and administrative tasks across the full process, from production and quality control to delivery planning."
      - "Planned workloads during peak periods, helping the company meet deadlines and quality standards."
      - "Managed priorities, resources, and unexpected issues in a real production environment, developing autonomy and operational responsibility."
    tags: [Production, Organization, Resource management, Quality control]

  - role: "IT Intern"
    company: Italtrans
    date: "June 2018 - August 2018"
    location: "Calcinate, Italy"
    headline: "Provided technical and system support to internal users, contributing to workstation maintenance and operational continuity."
    points:
      - "Supported users and departments by translating operational needs into practical IT interventions."
      - "Repaired and upgraded workstations, managed support tickets, and maintained company hardware."
    tags: [IT support, Hardware, Ticketing, Internship]

  - role: "Programmer"
    company: Garmsafe
    date: "November 2016 - January 2018"
    location: "Bergamo, Italy"
    headline: "Led the software development of a simulated training enterprise project, turning a hardware prototype into a working demonstration."
    points:
      - "Designed and developed the software used to acquire and process data from ultrasonic sensors."
      - "Coordinated a team of four from planning through the final presentation, contributing to a first-place finish in the IFS competition."
    tags: [Arduino, Sensors, Coordination, 3D modeling, Teamwork]

projects:
  - name: Nexenne Library
    kind: Personal · open source
    date: "2026 - present"
    location: "Bergamo, Italy"
    current: true
    headline: "A modular collection of independent C++23 libraries designed to turn experimental code into reusable, testable, and maintainable components."
    points:
      - "Defined a component-based architecture in which each module can be integrated, tested, and distributed independently, improving reuse and isolation."
      - "Develop modules for utilities, containers, time handling, and random generation, following standard library conventions to provide predictable APIs."
      - "Set up testing with Doctest, CMake presets, AddressSanitizer, and UndefinedBehaviorSanitizer to detect regressions and correctness issues."
      - "Apply ideas developed in Enne 2D to a simpler and more modular foundation without carrying over the complexity of the original project."
    link: github.com/signorenne/nexenne
    tags: [C++23, CMake, Doctest, Agile development]

  - name: TrackOMatic
    kind: Personal · archived · open source
    date: "November 2022 - February 2023"
    location: "Chiuduno, Italy"
    headline: "A native Android application for recording, synchronizing, and analyzing outdoor activities, developed from architecture to user experience."
    points:
      - "Designed and developed the entire application using MVVM, Clean Architecture, and Jetpack Compose."
      - "Integrated Google Maps, location services, and Firebase for authentication, synchronization, backend features, and cloud storage."
      - "Defined and documented user flows, architecture, and module responsibilities, maintaining a clear separation between application layers."
      - "Optimized GPS tracking to balance accuracy, background continuity, and energy consumption during real-world use."
    link: github.com/signorenne/trackomatic
    tags: ["Clean Architecture", MVVM, Firebase]

skills:
  - title: Software design and system architecture
    items: [Component-based architecture, Stable API design, Hardware abstraction, Event-driven systems, State and data-flow modeling, Protocol architecture, Hardware/software integration, Existing codebase evolution]
  - title: Languages
    items: [C, C++20/23, Kotlin, Java, Python, TypeScript, Bash]
  - title: Modern C++ and libraries
    items: [STL, Templates and generic programming, C++20 Concepts, Ranges and views, RAII and ownership, Strong types and type safety, Boost, fmt, spdlog, nlohmann/json]
  - title: Firmware and embedded systems
    items: [ESP32, ESP-IDF, FreeRTOS, PlatformIO, Embedded Linux, Real-time systems, Inputs and peripherals, Power and battery management]
  - title: HMI, graphics, and applications
    items: [Qt, QML, LVGL, SDL, OpenGL, GLSL, Android, Jetpack Compose, Coroutines and Flow, Dagger Hilt, Google Maps]
  - title: Interfaces and protocols
    items: [USB Device, HID, CDC, TinyUSB, UART, I²C, SPI, CAN/CAN FD, DBC, BLE/GATT, NimBLE, TCP/IP, MQTT, RPC, Framing and serialization, CRC and error detection]
  - title: Web, backend, and data
    items: [SvelteKit, REST APIs, Firebase, MongoDB, MySQL]
  - title: Systems and networking
    items: [GNU/Linux, System administration, nftables, iptables, WireGuard, Package management]
  - title: Toolchain, testing, and quality
    items: [Git, GitHub Actions, CMake, Conan, Gradle, GDB, Doctest, Doxygen, AddressSanitizer, UndefinedBehaviorSanitizer, Target hardware testing]
  - title: Professional approach
    items: [Attention to detail, Pragmatism, Problem solving, Critical thinking, Priority management, Leadership, Technical communication]

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
