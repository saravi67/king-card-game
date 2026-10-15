# King (Rıfkı) - PocketVibe El Konsolu Kağıt Oyunu

PocketVibe el konsolları (Anbernic RG34XX SP, RG DS, Android el konsolları) ve modern web tarayıcıları için Three.js ile geliştirilmiş klasik Türk usulü **King (Rıfkı)** kağıt oyunu.

---

## 🎮 Nasıl Oynanır ve Çalıştırılır?

### 1. Bilgisayarda / Tarayıcıda Oynamak İçin:
```bash
cd king-game
npm run dev
```
Tarayıcınızda açılan ekranda el konsolunun simülasyonu çalışacaktır.

**Klavye Tuş Karşılıkları:**
- **Ok Tuşları (D-pad):** Eldeki kartlar arasında gezinme / Menüde hareket
- **X Tuşu (A Butonu):** Seçili kartı masaya at / Seçimi onayla
- **Z Tuşu (B Butonu):** Geri dön / Açık menüyü veya skor tablosunu kapat
- **S Tuşu (X Butonu):** Skor Tablosunu (Scoreboard) aç / kapat
- **A Tuşu (Y Butonu):** King Kural ve Ceza Kılavuzunu aç / kapat
- **Enter (START):** Yeni oyun başlat / Menü
- **P Tuşu:** Handheld Performans Paneli (FPS, Üçgen sayısı, Draw calls)

---

### 2. Kendi El Konsolunuzda (Anbernic vb.) Oynamak İçin:
Aynı Wi-Fi ağına bağlıyken oyun klasöründe şunu çalıştırın:
```bash
npx pocketvibe serve
```
Konsolunuzda PocketVibe arayüzünden **Settings > Stores > Add a store** kısmına ekranda çıkan IP adresini girin (`http://192.168.x.x:8740`). Oyun doğrudan el konsolunuza inecektir!

---

## 🃏 Oyun Özellikleri ve Kuralları

- **Oyun Modları:**
  - ⚡ **Hızlı Oyun (4 El):** Her oyuncu 1 kontrat söyler (hızlı ve seri maç).
  - 🏆 **Klasik Tam King (20 El):** 12 Ceza eli + 8 Koz eli.
- **Yapay Zeka (AI):** Ali (Batı), Ayşe (Kuzey) ve Can (Doğu) botları; el durumuna göre en mantıklı kontratı seçer, renk uyma ve ceza kaçırma stratejilerini uygular.
- **6 Farklı Ceza Eli:**
  1. **El Almaz:** Alınan her el -50 puan.
  2. **Kupa Almaz:** Alınan her Kupa kartı -30 puan. (Kupa kırılmadan kupa açılamaz).
  3. **Erkek Almaz:** Alınan her Vale (J) ve Papaz (K) -60 puan.
  4. **Kız Almaz:** Alınan her Kız (Q) -100 puan.
  5. **Rıfkı:** Kupa Papazı (K♥) -320 puan!
  6. **Son İki:** 12. ve 13. ellerin her biri -180 puan.
- **4 Koz Rengi:**
  - Maça ♠, Kupa ♥, Karo ♦, Sinek ♣. Alınan her el +50 puan kazandırır.
- **3D Masa ve Kart Deneyimi:**
  - Düşük poligonlu (~250 üçgen), sabit 60 FPS garantili çuha masa ve 3D kartlar.
  - Seçilen kartın yukarı kalkması, ortaya atılma ve kazananın eli toplaması animasyonları.
- **Kayıt Sistemi:** En yüksek skorlar ve galibiyetler PocketVibe kalıcı hafızasında saklanır.
