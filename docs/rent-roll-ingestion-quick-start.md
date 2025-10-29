# Rent Roll AI Ingestion - Quick Start

## 🚀 5-Minute Setup

### 1. Set Environment
```bash
export ANTHROPIC_API_KEY="sk-ant-api03-your-key-here"
```

### 2. Start Services
```bash
# Terminal 1 - Backend
cd backend && python manage.py runserver

# Terminal 2 - Frontend
npm run dev
```

### 3. Test Upload
1. Open http://localhost:3000/rent-roll
2. Click "Upload Rent Roll"
3. Select: `reference/multifam/chadron/Chadron - Rent Roll + Tenant Income Info as of 09.17.2025.xlsx`
4. Wait 10-20 seconds
5. Review in modal
6. Click "Approve & Commit"

## 📊 Expected Results

**Excel File (Chadron):**
- 115 units
- 102 leases
- ~88% occupancy
- ~$449k monthly income
- 3 unit types

**PDF File (Chadron OM):**
- 113 units
- ~105 leases
- Similar metrics

## 🔧 Manual Processing

If automatic extraction doesn't trigger:

```bash
cd backend
python manage.py process_extractions
```

## 📁 Key Files

**Backend:**
- `backend/services/extraction/` - Extraction services
- `backend/apps/documents/views.py` - API endpoints
- `backend/apps/documents/models.py` - DMS models

**Frontend:**
- `src/components/extraction/StagingModal.tsx` - Review UI
- `src/app/rent-roll/page.tsx` - Upload integration

**Docs:**
- `docs/rent-roll-ingestion-COMPLETE.md` - Full summary
- `docs/rent-roll-ingestion-testing-guide.md` - Detailed testing
- `docs/rent-roll-ingestion-implementation-summary.md` - Technical details

## 🆘 Troubleshooting

**"Extraction not complete"** → Run worker: `python manage.py process_extractions`

**"Upload failed"** → Check Claude API key is set

**"CORS error"** → Verify backend is on port 8000

**"No data in modal"** → Check browser console for errors

## 📞 Support

See full documentation in `docs/` folder or review implementation summary.

## ✅ Success Checklist

- [ ] Claude API key set
- [ ] Backend running (port 8000)
- [ ] Frontend running (port 3000)
- [ ] Test file uploaded successfully
- [ ] Staging modal displays data
- [ ] Commit creates database records

---

**Status:** ✅ Production Ready
**Last Updated:** October 24, 2025
