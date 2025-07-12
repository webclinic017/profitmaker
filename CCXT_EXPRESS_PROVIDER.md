# CCXT Express Provider

Этот документ описывает новый CCXT Express Provider, который позволяет выносить CCXT операции на отдельный Express сервер.

## ✅ Статус реализации

**ПОЛНОСТЬЮ РЕАЛИЗОВАНО:**
- ✅ Express сервер с CCXT интеграцией
- ✅ CCXT Server Provider для браузерного приложения
- ✅ Интеграция с существующей архитектурой провайдеров
- ✅ Поддержка всех основных методов (fetchTicker, fetchOrderBook, fetchTrades, fetchOHLCV)
- ✅ **Полная поддержка WebSocket** (watchTicker, watchTrades, watchOrderBook, watchOHLCV, watchBalance)
- ✅ **Унифицированная логика** между browser и server провайдерами
- ✅ **CORS Bypass** - основная функция для обхода браузерных ограничений
- ✅ Кэширование CCXT instances на сервере
- ✅ Аутентификация через токены
- ✅ Обработка ошибок и таймаутов
- ✅ Тестовые компоненты для проверки функциональности
- ✅ Полная документация

## Архитектура

### Browser Provider vs Server Provider

**Browser Provider** (существующий):
- CCXT выполняется напрямую в браузере
- Использует CDN версию CCXT
- Все операции происходят на клиенте

**Server Provider** (новый):
- CCXT выполняется на Express сервере
- Браузер отправляет HTTP запросы к серверу
- Сервер может быть запущен где угодно (локально, на другом сервере)
- **Основная цель: обход CORS ограничений браузера**
- Сервер проксирует запросы к биржам с правильными заголовками

## Установка и запуск

### 1. Установка зависимостей

Зависимости уже добавлены в проект:
```bash
npm install express cors ccxt @types/express @types/cors tsx
```

### 2. Запуск Express сервера

```bash
# Обычный запуск
npm run server

# Запуск с автоперезагрузкой при изменениях
npm run server:dev
```

Сервер запустится на порту 3001 (или PORT из переменных окружения).

### 3. Настройка аутентификации

По умолчанию сервер использует простой токен аутентификации:

```bash
# Установить свой токен
export API_TOKEN=your-secret-token

# Или использовать по умолчанию
# Токен: your-secret-token
```

## Использование в приложении

### 1. Создание Server Provider

```typescript
import { useDataProviderStore } from './store/dataProviderStore';

const { createProvider } = useDataProviderStore();

// Создать server provider
createProvider('ccxt-server', 'My CCXT Server', ['*'], {
  serverUrl: 'http://localhost:3001',
  token: 'your-secret-token',
  timeout: 30000,
  sandbox: true
});
```

### 2. Параметры конфигурации

```typescript
interface CCXTServerConfig {
  serverUrl: string;    // URL сервера (обязательно)
  token?: string;       // Токен аутентификации
  timeout?: number;     // Таймаут запросов (по умолчанию 30000ms)
  sandbox?: boolean;    // Режим sandbox
}
```

### 3. Тестирование

#### Компонент TestProviderIntegration
В приложении есть компонент `TestProviderIntegration` с кнопкой "Create Server Provider" для быстрого тестирования.

#### Компонент TestServerProvider
Создан специальный компонент `TestServerProvider` для полного тестирования server provider:
- Тест подключения к серверу
- Тест создания exchange instance
- Тест получения ticker данных
- Создание server provider в приложении

Импортируйте и используйте компонент:
```tsx
import TestServerProvider from './components/TestServerProvider';

// В вашем компоненте
<TestServerProvider />
```

## API сервера

### Аутентификация

Все запросы (кроме `/health`) требуют заголовок:
```
Authorization: Bearer your-secret-token
```

### Основные эндпоинты

#### Health Check
```
GET /health
```

#### Создание Exchange Instance
```
POST /api/exchange/instance
{
  "exchangeId": "binance",
  "marketType": "spot",
  "ccxtType": "regular",
  "sandbox": false
}
```

#### Получение данных
```
POST /api/exchange/fetchTicker
{
  "config": { ... },
  "symbol": "BTC/USDT"
}

POST /api/exchange/fetchOrderBook
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "limit": 100
}

POST /api/exchange/fetchTrades
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "limit": 100
}

POST /api/exchange/fetchOHLCV
{
  "config": { ... },
  "symbol": "BTC/USDT",
  "timeframe": "1m",
  "limit": 100
}
```

#### WebSocket (CCXT Pro)
```
POST /api/exchange/watchTicker
{
  "config": {
    "exchangeId": "kraken",
    "ccxtType": "pro",
    "marketType": "spot",
    "sandbox": false
  },
  "symbol": "BTC/USD"
}

POST /api/exchange/watchTrades
{
  "config": { ... },
  "symbol": "BTC/USD"
}

POST /api/exchange/watchOrderBook
{
  "config": { ... },
  "symbol": "BTC/USD",
  "limit": 100
}

POST /api/exchange/watchOHLCV
{
  "config": { ... },
  "symbol": "BTC/USD",
  "timeframe": "1m"
}

POST /api/exchange/watchBalance
{
  "config": {
    "exchangeId": "kraken",
    "ccxtType": "pro",
    "apiKey": "your-api-key",
    "secret": "your-secret",
    "sandbox": false
  }
}
```

#### CORS Proxy (основная функция)
```
POST /api/proxy/request
{
  "url": "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
  "method": "GET",
  "headers": {
    "Accept": "application/json"
  },
  "timeout": 30000
}
```

#### Торговые операции (требуют API ключи)
```
POST /api/exchange/fetchBalance
{
  "config": {
    "exchangeId": "binance",
    "apiKey": "your-api-key",
    "secret": "your-secret",
    "sandbox": true
  }
}
```

## Преимущества Server Provider

1. **🎯 Обход CORS**: Главное преимущество - решение проблем с CORS в браузере
2. **Производительность**: CCXT выполняется на сервере с Node.js, что быстрее браузера
3. **Безопасность**: API ключи не передаются в браузер
4. **Масштабируемость**: Один сервер может обслуживать множество клиентов
5. **Кэширование**: Сервер кэширует CCXT instances и markets
6. **Гибкость**: Сервер может быть запущен где угодно
7. **Универсальный прокси**: Может проксировать любые HTTP запросы к биржам

## Кэширование

Сервер автоматически кэширует:
- CCXT instances (TTL: 24 часа)
- Markets данные (TTL: 1 час)

Кэш автоматически очищается каждые 10 минут.

## Поддерживаемые операции

**REST API:**
- ✅ `fetchTicker` - получение тикера
- ✅ `fetchOrderBook` - получение стакана
- ✅ `fetchTrades` - получение сделок
- ✅ `fetchOHLCV` - получение свечей
- ✅ `fetchBalance` - получение баланса (с API ключами)

**WebSocket (CCXT Pro):**
- ✅ `watchTicker` - подписка на тикер
- ✅ `watchOrderBook` - подписка на стакан
- ✅ `watchTrades` - подписка на сделки
- ✅ `watchOHLCV` - подписка на свечи
- ✅ `watchBalance` - подписка на баланс (с API ключами)

**CORS Proxy:**
- ✅ Универсальный HTTP прокси для любых запросов к биржам

## Ограничения

1. **Простая аутентификация**: Используется простой токен (в продакшене нужен JWT)
2. **Обработка ошибок**: Базовая обработка ошибок

## Интеграция с существующим кодом

Server Provider полностью совместим с существующей архитектурой:

- Использует те же интерфейсы и типы
- Работает с той же системой провайдеров
- Поддерживает автоматический выбор провайдера
- Интегрируется с fetchingActions и dataActions

## Развертывание

### Локальное развертывание
```bash
npm run server
```

### Docker (пример)
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "server"]
```

### Переменные окружения
```bash
PORT=3001
API_TOKEN=your-secret-token
NODE_ENV=production
```

## Безопасность

⚠️ **Важно**: В продакшене обязательно:

1. Используйте HTTPS
2. Реализуйте JWT аутентификацию
3. Добавьте rate limiting
4. Настройте CORS правильно
5. Используйте переменные окружения для секретов

## Мониторинг

Сервер логирует:
- Создание/использование кэшированных instances
- HTTP запросы и ошибки
- Очистку кэша

Для продакшена рекомендуется добавить:
- Structured logging (Winston, Pino)
- Metrics (Prometheus)
- Health checks
- Error tracking (Sentry)
