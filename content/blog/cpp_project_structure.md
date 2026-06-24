---
title: "Come strutturare un progetto C++"
lang: it
date: 2024-03-28
desc: "Una struttura C++ ordinata, con librerie e applicazioni separate e una build più semplice da seguire."
read: "6 min"
tags: ["C++", "CMake", "Conan"]
categories: ["Programmazione", "Analisi", "Tutorial"]
image: "/blog/covers/cpp_project_structure.jpeg"
---
## Introduzione
Prima o poi ogni progetto C++ deve fare i conti con CMake, dipendenze, librerie interne e applicazioni costruite sopra quelle librerie.
Nei miei primi progetti perdevo spesso troppo tempo a organizzare le directory e a mantenere coerenti i vari `CMakeLists.txt`.
Quando la struttura non è chiara, basta aggiungere un modulo o una dipendenza per rendere la build più fragile del necessario.

Dopo aver studiato le pratiche di altri sviluppatori, ho trovato una struttura che mi piace per semplicità e chiarezza.

Quella che segue non è l'unica soluzione possibile. È una struttura pensata per:

- Evitare schemi che causano conflitti.
- Evitare di complicare la compilazione.
- Semplificare la lettura.

## Strumenti usati
Per l'esempio userò tre strumenti:

### CMake
> CMake è un software libero multipiattaforma per l'automazione dello sviluppo il cui nome è un'abbreviazione di cross platform make. Questo software nasce per rimpiazzare Automake nella generazione dei Makefile, cercando di essere più semplice da usare. Infatti, nella maggior parte dei progetti, non esiste un Makefile incluso nei sorgenti, dato che questo non è portabile.
>
> -- Wikipedia

Lo useremo per generare la build e compilare il progetto.

Non sarà una guida completa a CMake: qui mi interessa soprattutto mostrare come organizzare il progetto. Per approfondire, il riferimento migliore resta il [sito ufficiale di CMake](https://cmake.org/).

### Conan
> Conan is a dependency and package manager for C and C++ languages. It is free and open-source, works in all platforms ( Windows, Linux, OSX, FreeBSD, Solaris, etc.), and can be used to develop for all targets including embedded, mobile (iOS, Android), and bare metal. It also integrates with all build systems like CMake, Visual Studio (MSBuild), Makefiles, SCons, etc., including proprietary ones.
>
> -- Conan

Lo useremo per gestire dipendenze e pacchetti.

Per approfondire, la documentazione parte dal [sito ufficiale di Conan](https://conan.io/).

Prima di procedere, vediamo i passaggi minimi per usarlo nel progetto.

Si inizia generando un profilo Conan, che descrive compilatore, configurazione di build, architettura e altre impostazioni dell'ambiente.

```bash
conan profile detect --force
```

Al termine, sui sistemi Unix, nella home directory sarà presente la cartella `.conan2` con il profilo generato.

Per installare le dipendenze usiamo il comando seguente.

```bash
conan install . --output-folder=build --build=missing
```

Conan esegue due operazioni principali:

- Installa le librerie specificate nel `conanfile.txt` dal server remoto, in genere Conan Center, se disponibili.
    Il server contiene sia le recipe Conan, che descrivono come costruire le librerie, sia i pacchetti binari riutilizzabili.
- Genera diversi file nella directory `build`.
    - CMakeDeps genera i file necessari per far sì che CMake trovi le librerie che abbiamo scaricato.
    - CMakeToolchain genera un file toolchain per CMake per poter costruire il nostro progetto con CMake.

### Doxygen
> Doxygen è una applicazione per la generazione automatica della documentazione a partire dal codice sorgente di un generico software. È un progetto open source disponibile sotto licenza GPL, scritto per la maggior parte da Dimitri van Heesch a partire dal 1997.
>
> -- Wikipedia

Doxygen genera la documentazione a partire dai commenti presenti nel codice.

Anche qui non serve una guida completa: per i dettagli rimando al [sito ufficiale di Doxygen](https://www.doxygen.nl/).

## Struttura
La struttura del progetto ha la seguente forma.

```txt
.
├── CMakeLists.txt
├── conanfile.txt
├── conan_provider.cmake
├── libfoo
│   ├── CMakeLists.txt
│   ├── docs
│   │   └── CMakeLists.txt
│   ├── include
│   │   └── libfoo
│   │       └── foo.hpp
│   ├── src
│   │   └── foo.cpp
│   └── tests
│       ├── foo.test.cpp
│       └── main.cpp
└── standalone
    ├── CMakeLists.txt
    └── main.cpp
```

Vediamola più da vicino.

L'idea di fondo è separare i componenti del progetto per directory. Ogni cartella contiene un eseguibile o una libreria e definisce il relativo target.

`standalone` è il target eseguibile e usa la libreria `libfoo`. Rappresenta un'applicazione costruita sopra una o più librerie principali.

`libfoo` è una libreria statica usata da `standalone`, ma è organizzata come un componente autonomo, con interfaccia pubblica, implementazione, test e documentazione.
Ogni libreria dovrà:

- Seguire una struttura prevedibile.
    - Directory `include` per le dichiarazioni pubbliche, cioè l'interfaccia della libreria.
    - Directory `src` per le definizioni e gli header privati.
- Garantire la generazione della documentazione con Doxygen.
- Fornire un ambiente di testing con doctest (o similari).

L'immagine seguente mostra l'idea generale: gli eseguibili `app` usano librerie `core`, ma ogni componente rimane separato.

![](/blog/images/cpp_project_structure_example_1.png)

### TopLevel CMakeLists.txt
Il file `CMakeLists.txt` nella root contiene la configurazione principale del progetto.

```txt
cmake_minimum_required(VERSION 3.27)

### Project
project(cpp_project_structure VERSION 1.0 LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

### Packages
find_package(fmt REQUIRED)
find_package(doctest REQUIRED)
find_package(Doxygen REQUIRED)

### Subdirectories (the order is important)
add_subdirectory(libfoo)
add_subdirectory(standalone)

```

Abbiamo un solo progetto e specifichiamo a CMake di ricercare altri file di configurazione nelle sottocartelle libfoo e standalone, rispettivamente "core" e "app".
Impostiamo quindi le opzioni comuni e usiamo `find_package` per individuare le dipendenze necessarie alla compilazione.

### Gestione dipendenze
Il file `conanfile.txt` specifica i pacchetti che serviranno ai vari target del nostro progetto. Nel nostro caso [fmt](https://github.com/fmtlib/fmt) viene usato sia da
libfoo che da standalone, [doctest](https://github.com/doctest/doctest) viene richiesto da libfoo per gli unit tests.
Il contenuto di seguito.

```txt
[requires]
fmt/10.2.1
doctest/2.4.11

[layout]
cmake_layout
```

Per usare Conan con CMake, utilizziamo il wrapper [cmake-conan](https://github.com/conan-io/cmake-conan), in particolare
siamo interessati al file `conan_provider.cmake` che salviamo nella root del progetto.
Questo file ci tornerà utile in seguito.

### Target libfoo
Il target libfoo che nel caso in analisi si presenta come una libreria statica, segue la forma canonica di una libreria standard.
Tornando al concetto di un target per subdirectory, il nostro CMakeLists.txt diventa questo.

```txt
### Library libfoo
add_library(libfoo STATIC src/foo.cpp
        include/libfoo/foo.hpp)
add_library(libfoo::libfoo ALIAS libfoo)
set_target_properties(libfoo PROPERTIES VERSION 0.0)
target_include_directories(libfoo PUBLIC include PRIVATE src)
target_link_libraries(libfoo PRIVATE fmt::fmt)
target_compile_options(libfoo PRIVATE -Wall -Wextra -pedantic -Werror)
target_compile_features(libfoo PRIVATE cxx_std_17)

### Testing libfoo
add_executable(libfoo_tests tests/main.cpp)
target_link_libraries(libfoo_tests PRIVATE doctest::doctest)
target_compile_options(libfoo_tests PRIVATE -Wall -Wextra -pedantic -Werror)
target_compile_features(libfoo_tests PRIVATE cxx_std_17)

### Subdirectories
add_subdirectory(docs)
```

Abbiamo tre sezioni:

- Definizione della libreria e della sua configurazione.
- Impostazione e creazione del target per gli unit tests.
- Abilitazione e configurazione di Doxygen per la generazione della documentazione.

Per completezza, questo è il contenuto del `CMakeLists.txt` nella cartella `docs`.

```txt
set(DOXYGEN_ALPHABETICAL_INDEX NO)
set(DOXYGEN_BUILTIN_STL_SUPPORT YES)
set(DOXYGEN_CASE_SENSE_NAMES NO)
set(DOXYGEN_CLASS_DIAGRAMS NO)
set(DOXYGEN_DISTRIBUTE_GROUP_DOC YES)
# set(DOXYGEN_EXAMPLE_PATH "")
set(DOXYGEN_EXCLUDE bin)
set(DOXYGEN_EXTRACT_ALL YES)
set(DOXYGEN_EXTRACT_LOCAL_CLASSES NO)
set(DOXYGEN_FILE_PATTERNS *.hpp)
set(DOXYGEN_GENERATE_TREEVIEW YES)
set(DOXYGEN_HIDE_FRIEND_COMPOUNDS YES)
set(DOXYGEN_HIDE_IN_BODY_DOCS YES)
set(DOXYGEN_HIDE_UNDOC_CLASSES YES)
set(DOXYGEN_HIDE_UNDOC_MEMBERS YES)
set(DOXYGEN_JAVADOC_AUTOBRIEF YES)
set(DOXYGEN_QT_AUTOBRIEF YES)
set(DOXYGEN_QUIET YES)
set(DOXYGEN_RECURSIVE YES)
set(DOXYGEN_REFERENCED_BY_RELATION YES)
set(DOXYGEN_REFERENCES_RELATION YES)
set(DOXYGEN_SORT_BY_SCOPE_NAME YES)
set(DOXYGEN_SORT_MEMBER_DOCS NO)
set(DOXYGEN_SOURCE_BROWSER YES)
set(DOXYGEN_STRIP_CODE_COMMENTS NO)

doxygen_add_docs(
        libfoo_docs
        "../include/"
        ALL
        COMMENT "Generate HTML documentation for libfoo"
)
```

### Target standalone
La configurazione del target `standalone` è più semplice:

```txt
add_executable(standalone main.cpp)
target_link_libraries(standalone PRIVATE fmt::fmt libfoo::libfoo)
target_compile_options(standalone PRIVATE -Wall -Wextra -pedantic -Werror)
target_compile_features(standalone PRIVATE cxx_std_17)
```

## Compilazione
```bash
cmake -B build -S . -DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=conan_provider.cmake -DCMAKE_BUILD_TYPE=Debug
cmake --build build --config Debug
```

Con il primo comando eseguiamo la fase di configurazione out-of-tree, generando un sistema di compilazione.
Con il secondo costruiamo il progetto chiamando lo strumento di compilazione di sistema, make su Unix.

Ricordate il file `conan_provider.cmake` enunciato in precedenza?
Ebbene utilizzando l'impostazione `-DCMAKE_PROJECT_TOP_LEVEL_INCLUDES=conan_provider.cmake` nel processo di configurazione di cmake,
questo invoca automaticamente il comando `conan install` semplificandoci la gestione del progetto.

## Conclusione
Ora nella cartella build, sotto la root del progetto, troveremo i file binari e le librerie che abbiamo compilato, oltre alla documentazione
doxygen e all'eseguibile degli unit tests.

La struttura può essere estesa aggiungendo, per esempio, una pipeline di integrazione continua, altri eseguibili o nuove librerie.

Il [repository di esempio](https://github.com/signorenne/cpp_playground/tree/main/cpp_project_structure) contiene il progetto completo descritto nell'articolo.
