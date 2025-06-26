#!/bin/bash
set -e

# Set font for TTY (optional)
echo "Setting Terminus font for TTY..."
setfont ter-122b

# Update system
echo "Updating system..."
pacman -Syu --noconfirm

# Install essentials
echo "Installing basic packages: nano, terminus-font, Xorg, NetworkManager..."
pacman -S --noconfirm nano terminus-font networkmanager xorg xorg-xinit

# Enable and start NetworkManager
echo "Enabling and starting NetworkManager..."
systemctl enable NetworkManager
systemctl start NetworkManager

# Install XFCE and SDDM
echo "Installing XFCE and SDDM..."
pacman -S --noconfirm xfce4 xfce4-goodies sddm

# Enable SDDM display manager
echo "Enabling SDDM..."
systemctl enable sddm

# Create user
echo "Creating user 'pd0rk1n'..."
useradd -m -G wheel -s /bin/bash pd0rk1n
echo "Please enter password for user 'pd0rk1n':"
passwd pd0rk1n

# Setup user's xinitrc for fallback XFCE launch
echo "Setting up .xinitrc for pd0rk1n..."
echo "exec startxfce4" > /home/pd0rk1n/.xinitrc
chown pd0rk1n:pd0rk1n /home/pd0rk1n/.xinitrc

# Automatically grant wheel group sudo privileges
echo "Granting sudo privileges to wheel group..."
sed -i 's/^# %wheel ALL=(ALL:ALL) ALL/%wheel ALL=(ALL:ALL) ALL/' /etc/sudoers

echo "✅ Done! You can now reboot and log in as 'pd0rk1n'."
