обычный PORT - 8888

У тебя есть несколько API вызовов:
POST http://127.0.0.1:PORT/api/TOKEN/history
returns
{
  "data": [
    {
      "content": "Посчитатай \\integral cos(x) dx",
      "role": "user"
    },
    {
      "content": "\\[\n\\int \\cos(x)\\,dx = \\sin(x) + C,\n\\]\n\nгде \\(C\\) — произвольная постоянная интегрирования. (Потому что производная \\(\\sin(x)\\) равна \\(\\cos(x)\\).)",
      "reasoning_details": "User writes in Russian: \"Посчитатай \\integral cos(x) dx\". They ask to calculate the integral of cos(x) dx. Should give result with constant. As a \"Calculator AI\" for beginners, explain simply. Provide short answer, maybe with brief explanation. Probably give result: sin(x) + C. Could mention constant of integration. Provide in simple terms.\n\n",
      "role": "assistant"
    }
  ],
  "ok": true
}

Send Msg:
POST http://127.0.0.1:8888/api/TOKEN/chat
body:
{
  "content": "как тебя зовут"
}
returns:
The user asks "как тебя зовут" (what is your name). As a Calculator AI agent, we should respond as per system: we are Calculator AI agent, explain like for beginners. Should give short answer. Probably answer "Я — Calculator AI" or similar.
TOKEN
* transfer closed with outstanding read data remaining
* closing connection #0
curl: (18) transfer closed with outstanding read data remaining
Меня зовут **Calculator AI** – я здесь, чтобы просто и понятно считать и объяснять математические операции.⏎ 

- тут TOKEN является разделителем между reasoning и answer. Сообщения приходят в stream формате. тоесть по кусочкам. надо при получении chunk сразу показывать пользователю. 

Create token:
GET http://127.0.0.1:8888/api/create
returns
{
  "api": "MnpRzPQVRUfdgaHaULeajzNQLVDlpHCHcRCWUBcLPShJBuvLBJNsvjJZXwiAOArQSCOmHKLPZSDjTV",
  "live_in": 86400000,
  "ok": true
}

 - live_in - сколько токен живет в мс.

Remove token:
POST http://127.0.0.1:8888/api/TOKEN/remove
returns
{
    "ok": true
}

Check existence token:
POST http://127.0.0.1:8888/api/TOKEN/alive
returns
{
    "ok": true
}


при ошибке вовзращает

{
    "ok": false,
    "msg": "error message"
}


Если токен прошел срок жизни то ты должен заблокировать отправку сообщении. показать то что все. 
Токены сохраняй в кеше в браузере. Введи список чатов с разными токенами.

Добавь поддержку Markdown когда показываешь сообещниен.
Я использую npm.