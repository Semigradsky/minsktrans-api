[Demo here](https://rebrand.ly/minsktrans-api-demo)
===

Raw files
---
- `/routes.txt`
- `/shapes.txt`
- `/stops.txt`
- `/times.txt`

JSON
---
- `/routes` or `/routes.json`
```json
[
    {
        "id": "210146",
        "routeNum": "11",
        "operator": "5 АП",
        "validityPeriods": "17480,", // optional
        "routeType": "A>B",
        "routeTag": 0.17, // optional
        "routeName": "ДС Веснянка - Маршала Лосика",
        "weekdays": "1234567", // optional
        "stops": [
            "15846",
            "204289",
            ...
        ],
        "datestart": "d1-d5 - 10.11.2017<br>d6-d7 - 11.11.2017" // optional
    },
    ...
]
```
- `/stops` or `/stops.json`
```json
[
    {
        "id": "15288",
        "name": "1-й Наклонный пер.",
        "lng": 27.6556,
        "lat": 53.88226,
        "stops": [
            "15289",
            "15408"
        ]
    }
]
```

CSV
---
The same as JSON data but in CSV
- `/routes.csv`
- `/stops.csv`

KML
---
- `/stops.kml`
