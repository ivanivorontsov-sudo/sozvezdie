# Созвездие

Логическая игра для двух игроков: настолка (Print & Play) + приложение для Android.

* `engine/engine.js` — движок правил и ИИ (3 уровня), общий для приложения и моделирования.
* `engine/net.js` — сетевая игра: протокол синхронизации, транспорт через интернет (бесплатный ntfy.sh, резерв — публичные MQTT-брокеры), мост к Android для Bluetooth и Wi-Fi.
* `app/` — Android-приложение (WebView + Kotlin: Bluetooth RFCOMM, TCP + NSD в локальной сети).
* `sim/` — моделирование баланса ИИ против ИИ, результаты в `sim/*.json`.
* `test/` — тесты движка (`node test/engine-test.js`), протокола (`node test/net-test.js mem|mqtt`), интерфейса (`node test/ui-test.js`).
* `print/pnp.py` — генератор Print & Play PDF (цветной и ч/б).
* `deck/deck.py` — презентация.
* `docs/RULES.md` — правила.

Сборка APK: `cd app && ./gradlew assembleRelease` (ключ подписи хранится вне репозитория, путь задаётся `SOZ_SIGNING`).
