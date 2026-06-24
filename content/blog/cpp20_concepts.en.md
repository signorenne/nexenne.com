---
title: "C++20 Concepts"
lang: en
translated_from: it
auto_translated: false
date: 2024-08-25
desc: "An introduction to C++20 concepts: what they are, when they help and how to use them without making the code heavier."
read: "4 min"
tags: ["C++", "Tutorial"]
categories: ["Programming"]
image: "/blog/covers/cpp20_concepts.jpg"
---
## Introduction
This post introduces `concepts`, one of the most useful C++20 features for generic code. We will cover the essential terminology and see how concepts make template requirements explicit.

For a complete reference, cppreference has detailed [documentation on constraints and concepts](https://en.cppreference.com/w/cpp/language/constraints).

## Motivation
The first question is simple: what are concepts useful for?

When we write code we almost always want the algorithms and data structures we implement to be generic, that is, usable with different data types.
We want a single generic solution, without having to reimplement it for specific data types.
This has several advantages:

-   Better maintainability.
-   Reusing the same code with different types.
-   Allowing API users to provide custom types.

Common examples are standard-library algorithms and containers such as `std::swap` and `std::vector`.

In C++, this abstraction is expressed with templates. A template can be instantiated with different types, but sometimes the type cannot be arbitrary: the implementation may require specific operations or properties.

Suppose we have an algorithm that, given two values of the same type, wants to perform a binary addition and return the result.

```cpp
#include <iostream>
#include <format>

template <typename T>
auto add(T const& a, T const& b) -> T {
    return a + b;
}

auto main() -> int {
    std::cout << std::format("{}\n", add(1, 2));
    // std::cout << std::format("{}\n", add("foo", "bar")); -> compilation error
    return 0;
}
```

The generic template parameter `T` is unconstrained: from the compiler's point of view it can be instantiated with any type.
However, if you ask for this function to be instantiated with certain data types, the compiler will produce an error.

This happens because the function template implicitly requires the types passed as parameters to provide the binary addition operator.
If a type does not provide that operator, the compiler cannot generate the function.

But where does the compiler fail?

Not at the template declaration, but during instantiation, when the implementation tries to use an operation that is not available.

This produces error messages that are hard to decipher and causes plenty of frustration.
In medium-to-large codebases, with nested data structures, the situation worsens exponentially.

To work around this issue we need to introduce `constraints`, so that we can explicitly define the requirements of the template parameters.

## Terminology
### Template
A template is a construct that generates an ordinary type or function at compile time based on the arguments the user supplies for the template parameters.
A template's arguments can be constrained.

### Requirements
Requirements are expressed with the `requires` keyword, which describes the conditions that a type or expression must satisfy.
For details, see the [cppreference documentation on requires](https://en.cppreference.com/w/cpp/language/requires).

### Constraint
A `constraint` is a set of `requirements` on a template's arguments.

These are used to:

-   Correctly select function overloads.
-   Decide the most appropriate specialization for a template.

### Concepts
A concept is a predicate that wraps a set of constraints.
Each concept is evaluated at compile time and becomes part of the interface of a template when it is used as a constraint.

In addition:

-   A data type that satisfies all the requirements (and therefore the constraints) of a concept is said to model that concept.
-   A concept made up of another concept plus additional constraints is said to refine that concept (or those concepts).

## Syntax
Depending on the complexity of a constraint declaration, you can use three different syntaxes to enforce constraints.
All the definitions below are equivalent, and you can combine them. Note that std::integral is a predefined concept.

### Full, explicit declaration
Very useful when you have multiple constraints to enforce.

```cpp
template <typename T, typename Q>
    requires std::integral<T> and std::integral<Q>
auto add(T const t, Q const q) {
    return t + q;
}
```

### Intermediate declaration
```cpp
template <std::integral T, std::integral Q>
auto add(T const t, Q const q) {
    return t + q;
}
```

### Compact declaration
```cpp
auto add(std::integral auto const t, std::integral auto const q) {
    return t + q;
}
```

## Solution
To solve the problem, we declare the `Addable` concept and apply it to the parameters of `add`. In this case we use the compact form.

```cpp
#include <iostream>
#include <concepts>

template <typename T> concept Addable = requires(T a, T b) {
 a + b; // requirement 1
};

auto add(Addable auto const t, Addable auto const q) {
    return t + q;
}

auto main() -> int {
    std::cout << add(5, 6) << std::endl;
    //std::cout << add("foo", "bar") << std::endl;  -> compilation error
    return 0;
}
```

The template rejects any type that does not satisfy the requirement at compile time. Compared with the unconstrained version, the compiler can produce an error closer to the function interface and therefore easier to interpret.

## Conclusion
Concepts and constraints make template requirements explicit and help produce more understandable compilation errors. For more detail, cppreference offers a complete guide to [constraints and concepts](https://en.cppreference.com/w/cpp/language/constraints).
