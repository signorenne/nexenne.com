---
title: "C++20 Ranges and Views"
lang: en
translated_from: it
auto_translated: false
date: 2024-09-11
desc: "An example of how C++20 ranges and views make collection algorithms easier to read."
read: "4 min"
tags: ["C++"]
categories: ["Programming"]
image: "/blog/covers/cpp20_ranges_and_views.jpg"
---
## Introduction
This post shows how `std::ranges` and `std::views`, introduced in C++20, make algorithm composition on collections clearer.

## Computational model
### Problem
We want to write an algorithm that takes a collection of integers as input and returns only the ones divisible by 3, in reverse order.

The following table shows a few examples of input and output.

| Input                 | Output        |
|-----------------------|---------------|
| 3 0 10 9 12 7 30 14 6 | 6 30 12 9 0 3 |
| 12 14 303 25          | 25 303        |
| 15 17 21 0 18         | 18 0 21 15    |

### Pre-C++20 solution
```cpp
#include <algorithm>
#include <vector>
#include <iostream>

auto main() -> int {
    const std::vector<int> numbers{3, 0, 10, 9, 12, 7, 30, 14, 6};

    auto isDivisibleByThree = [](int const i) { return i % 3 == 0; };

    std::vector<int> tmp{};

    std::copy_if(numbers.begin(), numbers.end(), std::back_inserter(tmp), isDivisibleByThree);
    std::reverse(tmp.begin(), tmp.end());

    for (auto const& i : tmp)
        std::cout << i << " ";

    return 0;
}
```

This small snippet of code performs these steps:

-   Creates a temporary helper `std::vector`.
-   Copies into `tmp` all the elements of `numbers` that satisfy the `isDivisibleByThree` predicate.
-   Reverses the order of the elements in `tmp`.

The solution works, but it requires a temporary container and several separate steps. With C++20 we can describe the same transformation more directly.

### Solution with std::ranges
```cpp
#include <algorithm>
#include <vector>
#include <iostream>
#include <ranges>

auto main() -> int {
    const std::vector<int> numbers{3, 0, 10, 9, 12, 7, 30, 14, 6};

    auto isDivisibleByThree = [](int const i) { return i % 3 == 0; };

    auto result{std::views::reverse(std::views::filter(numbers, isDivisibleByThree))};

    for (auto const& i : result)
        std::cout << i << " ";

    return 0;
}
```

The difference is clear; before going into specifics, however, it's worth clarifying the concepts of range and view.

## Ranges
A range represents a sequence of elements, or more generally something that can be iterated.

By definition, a range is a pair of iterators `begin` and `end`: the first points to the start of a collection or sequence, the second to its end.

Standard-library containers satisfy this definition and can therefore be used as ranges.

### Classification
Ranges can be classified in different ways. One of the most important distinctions is based on iterator capabilities.

Having covered concepts in the [previous post](/blog/cpp20_concepts/), we can summarize ranges in the following table.

| Concept                          | Description                                                                  |
|----------------------------------|------------------------------------------------------------------------------|
| std::ranges::input_range         | Can be iterated from start to end `at least once`                            |
| std::ranges::forward_range       | Can be iterated from start to end `multiple times`                           |
| std::ranges::bidirectional_range | The iterator can perform the `--` operation (move to the previous element)   |
| std::ranges::random_access_range | The `[]` operator exists, allowing access to elements in constant time       |
| std::ranges::contiguous_range    | The elements are required to be stored contiguously in memory                |

This classification corresponds to the related iterator concepts, such as `std::forward_iterator`.

## Views
Three ideas about views are especially important:

-   A view is a range.
-   A view does not own the data it accesses.
-   A view applies changes only when an element is requested (lazy evaluation).

### A view is a range {#una-view-è-un-range}

By definition, a view \\(w\\) is a range defined on another range \\(r\\).
The view can apply transformations to the observed range through algorithms and other operations, taking advantage of lazy evaluation.

### A view does not own the data it accesses
When you access an element through a view, you still work with the data managed by the underlying range.

This has two implications:

-   Views are fast to create, because they don't need to copy the underlying data.
-   Structural transformations performed by the view do not modify the original container.

<!--listend-->

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};

    for (auto const& i : numbers)
        std::cout << i << " ";
    return 0;
}

// Output: 1 2 3 4 5
```

As you can see, the view did not modify the `numbers` range.
However, the opposite is true: if you modify the original container, the change is reflected on every view that uses that range.

So we would get

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};

    for (auto const& i : v)
        std::cout << i << " ";

    std::cout << std::endl;

    numbers[2] = 100;
    numbers[4] = 77;

    for (auto const& i : v)
        std::cout << i << " ";

    return 0;
}

// Output: 5 4 3 2 1
//         77 4 100 2 1
```

### Lazy evaluation
A view applies transformations when elements are requested, not necessarily when the view is created. This deferred evaluation avoids unnecessary work and copies.

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5};
    auto v{std::views::reverse(numbers)};
    std::cout << *v.begin() << std::endl; // the view is evaluated here
    return 0;
}

// Output: 5
```

### Composition and pipelines
You may wonder why I wrote

```cpp
auto v{std::views::reverse(numbers)};
```

instead of

```cpp
std::views::reverse v{numbers};
```

The reason is that `std::views::reverse` is not itself a view, but an adapter: it takes the underlying range, in this case a `std::vector`, and returns a view over it.
The exact type of the view is hidden behind the `auto` keyword; this way we don't have to worry about writing the view's template arguments.
Another advantage of this form is the ability to chain multiple adapters via pipes.

For example, instead of using

```cpp
auto v{std::views::reverse(std::views::filter(numbers, isDivisibleByThree))};
```

We can write

```cpp
auto v{numbers | std::views::filter(isDivisibleByThree) | std::views::reverse};
```

## Examples
We want to create a view of the first 5 elements of a std::vector and print the result.

```cpp
#include<iostream>
#include<vector>
#include<ranges>

auto main() -> int {
    std::vector numbers{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    auto v{numbers | std::views::take(5)};

    for (auto const& i : v)
        std::cout << i << " ";
}

// Output: 1 2 3 4 5
```

We want to use a range-based algorithm to print an `std::vector` in reverse order, excluding negative values.

```cpp
#include <algorithm>
#include <iostream>
#include <ranges>
#include <vector>

auto main() -> int {
    std::vector numbers{-1, 3, -100, -4, 0, 3, -7, 1};
    auto predicate = [](int const i) -> bool {
        return i >= 0;
    };
    auto printer = [](int const i) {
        std::cout << i << " ";
    };

    std::ranges::for_each(numbers | std::views::reverse | std::views::filter(predicate), printer);
}

// Output: 1 3 0 3
```

## Advanced concepts
### Range factories
The standard library also provides adapters that can generate a view without starting from an existing range.

One example is `std::views::iota`, which creates an incremental view of integers.

```cpp
#include <iostream>
#include <ranges>

auto main() -> int {
    for (int const i : std::views::iota(1, 7)) {
        std::cout << i << " ";
    }
}

// Output: 1 2 3 4 5 6
```

### Zip views
`std::views::zip`, introduced in C++23, lets you combine multiple ranges into a single view. Each produced element is a tuple containing the corresponding values from the source ranges.

Here is a small example.

```cpp
#include <iostream>
#include <ranges>
#include <vector>

auto main() -> int {

    std::vector numbers{1, 2, 3, 4};
    std::vector english{"cat", "dog", "table", "sun"};
    std::vector italian{"gatto", "cane", "tavolo", "sole"};

    for (const auto& i : std::views::zip(numbers, english, italian)) {
        std::cout << std::get<0>(i) << ". "
                  << std::get<1>(i) << ": "
                  << std::get<2>(i) << '\n';
    }

    return 0;
}
```

## Conclusion
Ranges and views let you describe a transformation pipeline without introducing unnecessary temporary containers. For a complete overview of the available adapters and algorithms, see the [ranges library documentation](https://en.cppreference.com/w/cpp/ranges).
