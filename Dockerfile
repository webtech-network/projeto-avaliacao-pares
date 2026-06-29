# Use an official PHP runtime as a parent image
FROM php:7.4-apache

# Set the working directory to /var/www/html/
WORKDIR /var/www/html/

# Copy the project files into the container at /var/www/html/
COPY . /var/www/html/

# Set the correct permissions
RUN chown -R www-data:www-data /var/www/html

# Install any necessary dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libzip-dev \
    && docker-php-ext-install zip \
    && docker-php-ext-install pdo_mysql \
    && rm -rf /var/lib/apt/lists/*

# Enable Apache modules
RUN a2enmod rewrite headers

# Set up PHP ini configurations
RUN mv "$PHP_INI_DIR/php.ini-development" "$PHP_INI_DIR/php.ini"
RUN sed -ri 's/display_errors = Off/display_errors = On/g' "$PHP_INI_DIR/php.ini"

# Garante que os erros do PHP também sejam registrados no error.log do Apache
# RUN echo 'log_errors = On' > "$PHP_INI_DIR/conf.d/docker-php-logging.ini"

# Declara o diretório de logs do Apache como ponto de montagem
# VOLUME ["/var/log/apache2"]

# Expose port 80 for Apache
EXPOSE 80

# Start Apache
CMD ["apache2-foreground"]