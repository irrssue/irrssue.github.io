---
title: "Learning Rust as a JavaScript Developer"
date: "2025-10-15 09:15:00"
tags: ["rust"]
summary: "My journey learning Rust after years of JavaScript. The borrow checker and I are now friends."
cover: ""
draft: false
---

## TL;DR
- Rust's type system caught bugs I didn't know existed
- The borrow checker is strict but helpful
- Performance gains are real

## Context

Coming from JavaScript, where `undefined is not a function` is a way of life, Rust's compiler felt like an overprotective parent. Everything needed types, lifetimes, and ownership rules. I almost gave up twice.

## Main

### The Borrow Checker Blues

The borrow checker rejected my first 20 programs. I couldn't understand why I couldn't have two mutable references. JavaScript let me do whatever I wanted! But then I read the Rust book chapter on ownership, and something clicked.

### Type Safety is Freedom

Once I stopped fighting the compiler and started listening to it, everything changed. The compiler was catching race conditions, memory leaks, and null pointer bugs before runtime. My programs were more reliable.

### Performance Matters

My first real project was rewriting a Node.js CLI tool in Rust. The speed difference was shocking - 50x faster on large files. The binary was tiny, and users loved not needing Node installed.

## Takeaways

- Read "The Rust Programming Language" book - seriously
- Start with small projects, not web servers
- Use `cargo clippy` for helpful hints
- The community is incredibly helpful
