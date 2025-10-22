# Django Admin Access Guide

## Admin Panel Access

**URL:** http://localhost:8000/admin/

**Login Credentials:**
- **Username:** `admin`
- **Password:** `admin123`

**IMPORTANT:** Change this password in production! This is just for local development.

## What You Can Do in Django Admin

### Current Features:
1. **View all Projects** - See all 7 projects from your database
2. **Edit Projects** - Modify project details, addresses, types, etc. with smart dropdown fields
3. **Create New Projects** - Add new development projects with validated field options
4. **Delete Projects** - Remove projects (be careful!)
5. **Search & Filter** - Find projects by name, city, state, type
6. **Smart Dropdowns** - All lookup-based fields now have dropdown selectors
7. **User Management** - Add more admin users if needed

### Admin Interface Sections:

**AUTHENTICATION AND AUTHORIZATION**
- Groups - Manage user groups
- Users - Manage admin users

**PROJECTS**
- Projects - Manage all real estate projects (7 currently in database)

## How to Use

1. **Open your browser** and go to: http://localhost:8000/admin/
2. **Login** with the credentials above
3. **Click "Projects"** to see your project list
4. **Click any project** to edit it
5. **Use the "Add Project +" button** to create new projects

## Project Fields You Can Edit:

### Basic Information:
- **Project Name** - Text field
- **Property Type** - Dropdown (MPC, Multifamily, Office, Retail, Industrial, Hotel) ✨ NEW
- **Project Type** - Dropdown from lookup table (lu_subtype) ✨ NEW
- **Development Type** - Dropdown (Master-Planned Community, Subdivision, etc.) ✨ NEW
- **Is Active** - Checkbox

### Location:
- **Address** - Text field
- **City** - Text field
- **County** - Text field
- **State** - Dropdown (US States) ✨ NEW
- **Latitude/Longitude** - Decimal fields
- **Acres** - Decimal field

### Project Details:
- Description
- Target Units
- Price Range (Low/High)

### Ownership:
- Legal Owner
- Developer/Owner
- Existing Land Use
- Assessed Value

### Financial Configuration:
- **Financial Model Type** - Dropdown (DCF, IRR Analysis, Simple Proforma, etc.) ✨ NEW
- **Discount Rate %** - Decimal field
- **Cost of Capital %** - Decimal field
- **Calculation Frequency** - Dropdown (Daily, Weekly, Monthly, Quarterly, Annual) ✨ NEW

### Dates:
- Start Date
- Analysis Start/End Dates

## Tips for Beginners:

1. **Search is your friend** - Use the search bar at the top to find projects quickly
2. **Filters on the right** - Filter by type, state, active status, date
3. **Save buttons** - Three options:
   - "Save and add another" - Save and create a new one
   - "Save and continue editing" - Stay on this page
   - "Save" - Save and go back to list

4. **History** - Django tracks all changes automatically

## Server Management

**To start the server:**
```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
python manage.py runserver
```

**To stop the server:**
Press `Ctrl+C` in the terminal

**Server is currently running in the background!**

## Security Notes

**For Production:**
1. Change the admin password to something strong
2. Use environment variables for credentials
3. Enable HTTPS
4. Limit admin access by IP if possible
5. Set up proper user permissions

**Current setup is for LOCAL DEVELOPMENT ONLY!**

## Adding Admin Link to Your React Navbar (Optional)

Add this to your React navbar component:

```jsx
<a
  href="http://localhost:8000/admin/"
  target="_blank"
  rel="noopener noreferrer"
  className="nav-link"
>
  Admin Panel
</a>
```

This opens the admin in a new tab, keeping your apps separate and clean.

## Troubleshooting

**Can't access admin?**
- Check server is running: `lsof -ti:8000`
- Restart server: Kill process and run `python manage.py runserver`

**Forgot password?**
```bash
cd /Users/5150east/landscape/backend
source venv/bin/activate
python manage.py changepassword admin
```

**Need to create another admin user?**
```bash
python manage.py createsuperuser
```

## Next Steps

As you add more models to your Django backend (containers, parcels, leases, etc.), they will automatically appear in the admin interface!

No additional frontend code needed - Django admin handles it all automatically.

---

**Django Admin is ready to use!** 🎉

Open http://localhost:8000/admin/ in your browser right now!
