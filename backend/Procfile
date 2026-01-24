release: python manage.py migrate
web: gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
