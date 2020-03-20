# AI Trading

## Description

AI Trading was an application developed for the Applied Investments class (FINE 541) at McGill to facilitate the approval/execution of stock and bond trades. A primary activity of the course involves managing an investment portfolio where trades were formally sent by email to the professor who would approve them before they were executed by an authorized trader, however several issues including incorrect formatting, missing data and not notifying other members caused problems for the professor and authorized trader. AI Trading solves these problems by providing a web interface for students to log in, get stock quotes, fill in the remaining trade details and submit with all formatting and email delivery handled on the backend. Also included are several error checks, input validators as well as the convenience of viewing the current stocks and cash available in the group's portfolio.

The application is built on Django with a fairly heavy amount of front-end Javascript/JQuery code. User data and group mappings are stored in a PostgreSQL database while financial data is stored in MongoDB. Security information is scraped from the [Morningstar UK](http://www.morningstar.co.uk/uk/) website (As there was no publicly available API that included ISIN data) and the portfolio data is pulled from BNY Mellon via SFTP. I have also utilized a library called [django-registration](https://django-registration.readthedocs.io) to support the use of activation emails and all emails are delivered through [SendGrid](https://sendgrid.com/)'s SMTP service.

## Table of contents

- [Technical Installation](#technical-installation)
  * [Environment Variables](#environment-variables)
  * [Database and Superuser Setup](#database-and-superuser-setup)
- [Usage](#usage)
  * [Admin](#admin)
  * [Regular Users](#regular-users)
    + [Registration](#registration)

## Technical Installation

### Environment Variables
A few environment variables are needed to ensure proper functionality. (Includes some default ones required by Django)

1. **DATABASE_URL**: URL of PostgreSQL database
2. **DEBUG** : Set to True if on development, ignore or set to false on production
3. **DEVELOPER_EMAIL**: Exceptions raised within [`etl_main.py`](aitrading/etl/etl_main.py) are sent here
4. **DJANGO_SETTINGS_MODULE**: Location of Django settings module
5. **KEEN_API_URL**: URL for Keen analytics
6. **KEEN_PROJECT_ID**: ID for Keen analytics
7. **KEEN_READ_KEY**: API key for reading Keen data (not really used but should still be set)
8. **KEEN_WRITE_KEY**: API key for writing Keen data
9. **MONGODB_URI**: URI for MongoDB database
10. **PKEY_PASSWORD** : The password to decrypt the private DSA key for SFTP access to BNY Mellon server
11. ~~**QUOTAGUARDSTATIC_URL** : The proxy url given by QuotaGuard (a Heroku add on). Not required if the server hosting this application has a static IP~~
**Deprecated**: New BNYM FTP server does not require a static IP
12. **SECRET_KEY** : Django's secret key, pick a random string
13. **SENDGRID_API_KEY** : The API key used to send emails via SMTP
14. **SFTP_HOST**: URL for BNY Mellon SFTP server
15. **SFTP_PORT**: Port number for BNY Mellon SFTP server
16. **SFTP_USERNAME**: Username for BNY Mellon SFTP server

### Database and Superuser Setup

1. Run `python manage.py migrate` to create user tables from the models
2. Run `python manage.py createsuperuser` to create a superuser that can log into the admin page
3. Go to the admin page, click to "Users" under the "Authentication and Authorization" pane and select the user just created
4. Under the groups section assign the superuser the group "supervisor" by clicking on the + icon to make a new group. Then save at the bottom of the page.
**NOTE: The "supervisor" group is only intended for course instructors as they will receive all trade emails, do not assign this group to any other user**

## Usage

### Admin

#### Setting up a new class
The first step at the beginning of each year is to delete all users from the previous year so that they are no longer able to access the service.
1. On the [admin page](https://aitrading.herokuapp.com/admin), go to "Users" and under the "Filter" pane, section "By staff status" click on "No". This refines the list to all non-staff users.
2. Select all users with the top left checkbox and under the "Action" drop down menu, select "Delete Selected Users". Click "Go" and confirm the accounts to be deleted. **Double check to ensure you do not delete your own account**
3. Return to the admin Home and click "Authorized users"
4. As in step 2, delete all users.

Now you can begin adding in the new group members by clicking on "Add Authorized User" in the top right. This links each student's email with an trading account (make sure to enter all 12 digits) so that when they create their account on the site in their own time, they are automatically associated with the correct group.

#### A student moves between groups

If there is a student that is moved from one group to another, this mapping needs to be changed in the application:
1. On the [admin page](https://aitrading.herokuapp.com/admin), click "Authorized users"
2. Click on the email of the student who needs to move groups
3. Edit the account number and click Save. The next time the student accesses the site, they will be shown the data for their new group.

### Regular Users

#### Registration
Registering an account can be done [here](https://aitrading.herokuapp.com/accounts/register/). Enter your McGill email (all lowercase) and follow the steps. Note that your unsername is what you will use to login **not your email address**.

#### Trading Bonds
Bond information must all be entered manually as this data is not available on Morningstar UK. For the price, use a par value of 1, not 100
