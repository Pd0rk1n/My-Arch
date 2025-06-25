#!/usr/bin/env bash

set -euo pipefail
IFS=$'\n\t'

echo ">> Updating system and installing base tools..."

# Base System
BASE_PACKAGES=(
  base base-devel bash-completion sudo nano man-db man-pages lsb-release linux linux-headers
  linux-firmware intel-ucode amd-ucode
  networkmanager network-manager-applet
  grub os-prober efibootmgr refind
  pacmanlogviewer arch-install-scripts
)

# Terminal + Shell
SHELL_TOOLS=(
  fish oh-my-zsh-git starship zsh-completions zsh-syntax-highlighting
  alacritty xfce4-terminal tmux screen
  fastfetch-git neofetch-git lolcat eza bat
)

# Xorg + Display Managers
DISPLAY_PACKAGES=(
  xorg-server xorg-xinit xorg-xrandr xorg-xinput xorg-xset xorg-xev xorg-xprop xorg-xauth
  sddm-git edu-sddm-simplicity-git
)

# Audio
AUDIO_PACKAGES=(
  alsa-utils pulseaudio pulseaudio-alsa pulseaudio-bluetooth pavucontrol pasystray
)

# Printing + Scanning
PRINT_SCAN=(
  cups cups-filters cups-pdf system-config-printer ghostscript
  simple-scan sane xsane
)

# Desktop Environment / Window Managers
DESKTOP_ENVIRONMENTS=(
  edu-xfce-git edu-qtile-git edu-arc-dawn-git edu-arc-kde edu-dot-files-git
  xfce4 xfce4-goodies xfwm4 xfdesktop xfce4-panel xfce4-settings
  qt5ct kvantum-qt5
  lxappearance-gtk3
)

# Fonts and Icons
FONTS_ICONS=(
  ttf-dejavu ttf-droid ttf-hack ttf-inconsolata ttf-ubuntu-font-family ttf-ms-fonts
  ttf-roboto ttf-roboto-mono ttf-meslo-nerd-font-powerlevel10k
  noto-fonts adobe-source-han-sans-cn-fonts adobe-source-han-sans-jp-fonts adobe-source-han-sans-kr-fonts
  adobe-source-sans-fonts
  bibata-cursor-theme breeze-icons sardi-icons surfn-icons-git neo-candy-icons-git
)

# Browsers + Internet
BROWSERS=(
  firefox firefox-ublock-origin chromium brave-bin
)

# AUR Helpers
AUR_TOOLS=(
  yay-git paru-git downgrade
)

# Development Tools
DEV_TOOLS=(
  git devtools arch-rebuild-order arch-repro-status arch-signoff python-pylint meld
  visual-studio-code-bin sublime-text-4
)

# File Management
FILE_TOOLS=(
  nemo nemo-fileroller nemo-share thunar thunar-archive-plugin thunar-volman
  file-roller xarchiver baobab catfish gnome-disk-utility gparted gpart gptfdisk
)

# System Monitoring + Admin
SYSTEM_TOOLS=(
  htop btop lshw lsscsi dmidecode hw-probe smartmontools inxi
  preload ananicy-cpp cachyos-ananicy-rules-git
)

# Media + Utilities
MULTIMEDIA=(
  vlc parole mpv ffmpegthumbnailer flameshot-git simplescreenrecorder-qt6-git evince ristretto
)

# Networking + Bluetooth
NETWORKING=(
  avahi dnsmasq iw iwd modemmanager wpa_supplicant networkmanager-openconnect
  networkmanager-openvpn networkmanager-pptp networkmanager-vpnc
  blueberry bluez bluez-utils bluez-libs
)

# Virtualization
VIRTUALIZATION=(
  hyperv open-iscsi openvpn pptpclient xl2tpd vpnc
)

# Miscellaneous
MISC=(
  yad menulibre mugshot picom-git ulauncher galculator hardinfo2 xed
  edu-hblock-git edu-rofi-git edu-rofi-themes-git edu-variety-config-git edu-shells-git
)

# Bootloaders and Init
BOOT_INIT=(
  mkinitcpio mkinitcpio-firmware mkinitcpio-nfs-utils systemd-resolvconf
)

# Filesystem Tools
FILESYSTEM=(
  btrfs-progs exfatprogs ntfs-3g f2fs-tools xfsprogs dosfstools mtools udftools
)

# Terminal Tools
TERM_UTILS=(
  micro vim eza ripgrep the_silver_searcher scrot
)

# Install AUR helper if none found
install_aur_helper() {
  if ! command -v yay &>/dev/null && ! command -v paru &>/dev/null; then
    echo "No AUR helper found. Installing yay..."
    pacman -Sy --needed git base-devel
    git clone https://aur.archlinux.org/yay.git /tmp/yay
    pushd /tmp/yay
    makepkg -si --noconfirm
    popd
  fi
}

# Remove conflicting packages
remove_conflicts() {
  echo ">> Removing conflicting packages..."
  pacman -Rns --noconfirm qtile
}

# Install all groups
install_all() {
  echo ">> Installing categorized package sets..."
  pacman -Syu --noconfirm --needed "${BASE_PACKAGES[@]}" "${SHELL_TOOLS[@]}" "${DISPLAY_PACKAGES[@]}" \
    "${AUDIO_PACKAGES[@]}" "${PRINT_SCAN[@]}" "${DESKTOP_ENVIRONMENTS[@]}" "${FONTS_ICONS[@]}" \
    "${BROWSERS[@]}" "${DEV_TOOLS[@]}" "${FILE_TOOLS[@]}" "${SYSTEM_TOOLS[@]}" "${MULTIMEDIA[@]}" \
    "${NETWORKING[@]}" "${VIRTUALIZATION[@]}" "${MISC[@]}" "${BOOT_INIT[@]}" "${FILESYSTEM[@]}" \
    "${TERM_UTILS[@]}"
}

# Main
remove_conflicts
install_all
install_aur_helper

echo ">> Installing AUR packages..."
yay -S --noconfirm "${AUR_TOOLS[@]}"

echo "✅ Post-install complete!"
