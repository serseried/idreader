# Pasaport ve Kimlik Okuyucu

Pasaport ve kimlik kartı tarayıcılarından gelen verileri okuyan ve ayrıştıran, ardından çıkarılan bilgileri forma otomatik olarak dolduran bir Chrome eklentisi.

## Ozellikler

- **Otomatik Algilama**: Belge turunu otomatik olarak algılar (Pasaport / Kimlik Karti)
- **Tarayici Girisi**: Donanim tarayicilarindan gelen girisleri dinler

## Cikarilan Alanlar

| Alan | Aciklama |
|------|----------|
| Belge Turu | P (Pasaport), I (Kimlik Karti), vb. |
| Veren Ulke | 3 harfli ulke kodu |
| Soyadi | Soyadi |
| Adi | Ad(lar) |
| Pasaport/Kimlik No | Belge numarasi |
| Uyruk | 3 harfli uyruk kodu |
| Dogum Tarihi | YYYY-MM-DD formatinda |
| Cinsiyet | Erkek / Kadin |
| Son Gecerlilik Tarihi | Belge gecerlilik tarihi |
| TC Kimlik No | TC kimlik numarasi |

## Kurulum

1. Chrome'u acin ve `chrome://extensions/` adresine gidin
2. "Gelistirici modu"nu etkinlestirin
3. "Paketlenmemis oge yukle" butonuna tiklayin
4. Proje klasorunu secin

## Kullanim

1. Eklenti simgesine tiklayarak popup'i acin
2. Giris alanina odaklanin
3. Pasaport veya kimlik kartini tarayici ile okutun
4. Ayristirilan veriler sonuc tablosunda gorunecektir
