#!/usr/bin/env python3
"""Turcryptor CLI — secure text encryption (AES-256-GCM + Scrypt)."""

import getpass
import sys

from rich.align import Align
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.text import Text

from turcryptor.core import decrypt_message, encrypt_message

APP_NAME = "TURCRYPTOR"

console = Console()


# ══════════════════════════════════════════════════════════════════════════════
# VISUAL INTERFACE
# ══════════════════════════════════════════════════════════════════════════════

def gradient_text(text: str) -> Text:
    colors = [
        "bright_magenta",
        "magenta",
        "purple",
        "bright_blue",
        "cyan",
        "bright_cyan",
    ]

    result = Text()
    visible = [char for char in text if char != "\n"]
    total = max(len(visible) - 1, 1)

    index = 0
    for char in text:
        if char == "\n":
            result.append("\n")
            continue
        color = colors[min(index * (len(colors) - 1) // total, len(colors) - 1)]
        result.append(char, style=f"bold {color}")
        index += 1

    return result


def show_logo():
    logo = r"""
████████╗██╗   ██╗██████╗  ██████╗██████╗ ██╗   ██╗██████╗ ████████╗ ██████╗ ██████╗
╚══██╔══╝██║   ██║██╔══██╗██╔════╝██╔══██╗╚██╗ ██╔╝██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗
   ██║   ██║   ██║██████╔╝██║     ██████╔╝ ╚████╔╝ ██████╔╝   ██║   ███████║██████╔╝
   ██║   ██║   ██║██╔══██╗██║     ██╔══██╗  ╚██╔╝  ██╔═══╝    ██║   ██╔══██║██╔══██╗
   ██║   ╚██████╔╝██║  ██║╚██████╗██║  ██║   ██║   ██║        ██║   ██║  ██║██║  ██║
   ╚═╝    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝   ╚═╝   ╚═╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
"""
    console.print(Align.center(gradient_text(logo)))
    console.print(Align.center(Text("Secure Text Encryption", style="bold white")))
    console.print(
        Align.center(Text("AES-256-GCM  •  Scrypt  •  Local Only", style="dim cyan"))
    )
    console.print(Align.center(Text("crafted by Yassin", style="italic bright_magenta")))
    console.print()


def show_header():
    console.clear()
    show_logo()


def show_menu():
    menu = Text()
    menu.append("\n   [1]  ", style="bold bright_cyan")
    menu.append("LOCK", style="bold white")
    menu.append("       Encrypt a message\n", style="dim")
    menu.append("   [2]  ", style="bold bright_magenta")
    menu.append("UNLOCK", style="bold white")
    menu.append("     Decrypt a message\n", style="dim")
    menu.append("   [0]  ", style="bold red")
    menu.append("EXIT", style="bold white")
    menu.append("       Close Turcryptor\n", style="dim")

    console.print(
        Align.center(
            Panel(
                Align.center(menu),
                title="[bold white] TURCRYPTOR [/bold white]",
                subtitle="[dim]secure text utility[/dim]",
                border_style="bright_blue",
                padding=(1, 5),
            )
        )
    )


def show_status(message: str, style: str = "cyan"):
    console.print()
    console.print(Align.center(Text(message, style=f"bold {style}")))


def ask_password(prompt: str) -> str:
    password = getpass.getpass(prompt)
    if not password:
        show_status("✦ Password cannot be empty.", "yellow")
    return password


# ══════════════════════════════════════════════════════════════════════════════
# ENCRYPT
# ══════════════════════════════════════════════════════════════════════════════

def encrypt_mode():
    show_header()

    console.print(
        Panel(
            "[bold bright_cyan]LOCK MODE[/bold bright_cyan]\n\n"
            "[dim]Your message will be encrypted locally using AES-256-GCM.[/dim]",
            border_style="bright_magenta",
            padding=(1, 3),
        )
    )
    console.print()

    message = Prompt.ask("[bold white]Message[/bold white]")
    if not message:
        show_status("✦ Message cannot be empty.", "yellow")
        return

    console.print()
    password = ask_password("  Password: ")
    if not password:
        return
    confirm = getpass.getpass("  Confirm : ")
    if password != confirm:
        show_status("✦ Passwords do not match.", "red")
        return

    encrypted = encrypt_message(message, password)

    console.print()
    console.print(
        Panel(
            encrypted,
            title="[bold bright_cyan] ENCRYPTED PAYLOAD [/bold bright_cyan]",
            border_style="bright_magenta",
            padding=(1, 2),
        )
    )
    show_status("✓ Encryption complete.", "bright_cyan")


# ══════════════════════════════════════════════════════════════════════════════
# DECRYPT
# ══════════════════════════════════════════════════════════════════════════════

def decrypt_mode():
    show_header()

    console.print(
        Panel(
            "[bold bright_magenta]UNLOCK MODE[/bold bright_magenta]\n\n"
            "[dim]Paste a Turcryptor encrypted payload to recover the original message.[/dim]",
            border_style="bright_cyan",
            padding=(1, 3),
        )
    )
    console.print()

    encrypted = Prompt.ask("[bold white]Encrypted message[/bold white]")
    if not encrypted:
        show_status("✦ Encrypted message cannot be empty.", "yellow")
        return

    console.print()
    password = ask_password("  Password: ")
    if not password:
        return

    try:
        message = decrypt_message(encrypted, password)
    except ValueError as error:
        console.print()
        console.print(
            Panel(
                str(error),
                title="[bold red] DECRYPTION FAILED [/bold red]",
                border_style="red",
                padding=(1, 2),
            )
        )
        return

    console.print()
    console.print(
        Panel(
            message,
            title="[bold bright_cyan] DECRYPTED MESSAGE [/bold bright_cyan]",
            border_style="bright_cyan",
            padding=(1, 2),
        )
    )
    show_status("✓ Decryption complete.", "bright_cyan")


# ══════════════════════════════════════════════════════════════════════════════
# MAIN LOOP
# ══════════════════════════════════════════════════════════════════════════════

def main():
    while True:
        show_header()
        show_menu()

        choice = Prompt.ask("\nSelect", choices=["1", "2", "0"], default="1")

        if choice == "1":
            encrypt_mode()
        elif choice == "2":
            decrypt_mode()
        else:
            console.clear()
            console.print()
            console.print(Align.center(Text(APP_NAME, style="bold bright_magenta")))
            console.print(Align.center(Text("session closed", style="dim cyan")))
            console.print()
            break

        console.print()
        Prompt.ask(
            "[dim]Press Enter to return to the main menu[/dim]",
            default="",
            show_default=False,
        )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        console.print("\n\n[dim cyan]Turcryptor closed.[/dim cyan]")
        sys.exit(0)
