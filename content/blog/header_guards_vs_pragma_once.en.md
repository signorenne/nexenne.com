---
title: "Header guards vs pragma once"
lang: en
translated_from: it
auto_translated: false
date: 2024-04-24
desc: "A comparison between header guards and pragma once, with benefits and limits of both options."
read: "4 min"
tags: ["C++"]
categories: ["Programming", "Analysis"]
image: "/blog/covers/header_guards_vs_pragma_once.jpeg"
---
## Introduction
While developing the "Enne 2D Engine" project, I asked myself more than once: why do I keep writing header guards when I could just use the `#pragma once` directive?

So I decided to dig into the question and share my analysis.

## Why do declaration files need to be protected? {#perché-serve-proteggere-i-file-di-dichiarazione}

### The ODR principle
The One Definition Rule is a fundamental rule in C++.

In simplified form, it states that a function, variable, or type must respect precise constraints on how many definitions may appear in a program.

Violating the ODR can cause "multiple definitions" errors during compilation or linking problems when the linker cannot decide which definition to use.

In the example below, with three files, compilation fails because `struct foo` is defined more than once.

File alpha.hpp

```cpp
struct foo {};
```

File bravo.hpp

```cpp
#include "alpha.hpp"
```

File charlie.hpp

```cpp
#include "alpha.hpp"
#include "bravo.hpp"
```

The preprocessor, once the relevant substitutions are done, produces the following result.

```cpp
struct foo {};
struct foo {};
```

So how do you make sure the ODR is respected?

The first solution that comes to mind, although very spartan, is to manage the `#include` hierarchy manually.
In the example above, you would have to avoid including `alpha.hpp` in `charlie.hpp`.
This is fragile and does not scale to medium or large projects.

There are two common solutions:

-   Header guards.
-   The `#pragma once` directive.

## Header guards
The solution that is part of the C++ standard is the use of header guards.
These guards prevent a header file from being included more than once in a single translation unit.
To achieve this, they use preprocessor macros to check whether the header has already been included before.
If it has already been included, those clauses prevent it from being included again.

The `#define` directive creates a macro, that is, the association of an identifier (or an identifier with parameters) with a string of tokens.
Once the macro is defined, the compiler can substitute the token string for every occurrence of the identifier in the source file.

Going back to the previous example, with a few small changes we get:

File alpha.hpp

```cpp
#ifndef ALPHA_HPP
#define ALPHA_HPP

struct foo {};

#endif // ALPHA_HPP
```

File bravo.hpp

```cpp
#ifndef BRAVO_HPP
#define BRAVO_HPP

#include "alpha.hpp"

#endif // BRAVO_HPP
```

File charlie.hpp

```cpp
#ifndef CHARLIE_HPP
#define CHARLIE_HPP

#include "alpha.hpp"
#include "bravo.hpp"

#endif // CHARLIE_HPP
```

After the relevant substitutions, the preprocessor produces the following result.

```cpp
struct foo {};
```

When working on large projects, it is important to define clear guidelines for macro names: using only the file name can easily lead to clashes. Other problems appear when a header is copied and the macro is not updated, or when the final `#endif` is missing.
Tools such as clang-tidy can help catch some of these mistakes.

I, for example, follow this scheme to define a macro name: `<PROJECT_ROOT>_<RELATIVE_PATH_TO_HPP_FILE>_<FILE_NAME>_HPP_`.

This avoids generating the same identifier for two files with the same name.

Assume the following structure, with `CPP_PROJECT` as the root directory, and two files with the same name in different directories.

```txt
.
├── libfoo
│   ├── CMakeLists.txt
│   ├── docs
│   │   └── CMakeLists.txt
│   ├── include
│   │   └── libfoo
│   │       ├── detail
│   │       │   └── alpha.hpp
│   │       └── common
│   │           └── alpha.hpp
```

The macro name on the `alpha.hpp` file inside the `detail` directory will be:

```cpp
#define CPP_PROJECT_LIBFOO_INCLUDE_LIBFOO_DETAIL_ALPHA_HPP_
```

The macro name on the `alpha.hpp` file inside the `common` directory will be:

```cpp
#define CPP_PROJECT_LIBFOO_INCLUDE_LIBFOO_COMMON_ALPHA_HPP_
```

## Pragma once
The alternative to header guards, widely used but not part of the C++ standard, is the `#pragma once` directive.

File alpha.hpp

```cpp
#pragma once

struct foo {};
```

File bravo.hpp

```cpp
#pragma once

#include "alpha.hpp"
```

File charlie.hpp

```cpp
#pragma once

#include "alpha.hpp"
#include "bravo.hpp"
```

After the relevant substitutions, the preprocessor produces the following result.

```cpp
struct foo {};
```

You write less code and avoid macro-name clashes, but this solution has trade-offs.

`#pragma once` is not part of the C++ standard, so compilers are not required by ISO C++ to support it.

But why isn't it part of the standard?

The answer lies in the complexity of detecting file equality consistently.
One known issue involves reaching the same file through different paths or symbolic links. In some cases, a compiler may fail to recognize that two paths refer to the same header and include it more than once. See <https://en.m.wikipedia.org/wiki/Pragma_once#Caveats>.

There is also no guarantee that support for `#pragma once` is the same across different compilers, which can be a problem for some developers.

## Header guards or pragma once?
It depends on the case.

The choice depends on portability requirements and project conventions.

Header guards are standard and work everywhere, at the cost of a few extra lines and a reliable macro convention. `#pragma once` is shorter and widely supported by common compilers, but it is not part of the standard.

## Conclusion
For projects where portability is a priority, I prefer header guards. In codebases with a well-defined toolchain, `#pragma once` remains a pragmatic and widely supported choice.
