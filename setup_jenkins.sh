#!/usr/bin/env bash
set -e

echo "=== [1/6] Cau hinh Swap 2GB de tranh tran RAM ==="
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "=== [2/6] Cap nhat he thong & Cai dat Java Runtime ==="
sudo apt-get update -y
sudo apt-get install -y fontconfig default-jre-headless ca-certificates curl gnupg

echo "=== [3/6] Cai dat Jenkins Repository & Key 2026 ==="
sudo mkdir -p /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y jenkins

echo "=== [4/6] Khoi dong service Jenkins ==="
sudo systemctl enable jenkins
sudo systemctl restart jenkins

echo "=== [5/6] Cai dat Docker & Docker Compose ==="
sudo install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
fi

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Phan quyen Docker
sudo usermod -aG docker ubuntu
sudo usermod -aG docker jenkins

# Khoi dong lai Jenkins de nhan quyen docker
sudo systemctl restart jenkins

echo "=== [6/6] Cho Jenkins khoi dong hoan tat de lay Initial Password ==="
for i in {1..30}; do
    if [ -f /var/lib/jenkins/secrets/initialAdminPassword ]; then
        break
    fi
    sleep 2
done

echo "=========================================="
echo "JENKINS DA DUOC CAI DAT THANH CONG!"
echo "PUBLIC IP: 13.239.14.74"
echo "PORT: 8080"
echo -n "ADMIN INITIAL PASSWORD: "
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
echo "=========================================="
