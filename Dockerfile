FROM python:3.11-slim

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PIP_DISABLE_PIP_VERSION_CHECK=on


# set work directory
WORKDIR /app

# install dependencies
RUN useradd --create-home --shell /bin/bash app
USER app

# export port
EXPOSE 8000

# run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "yabatech_bookstore.wsgi:application"]