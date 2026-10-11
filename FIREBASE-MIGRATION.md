# Migrasi ke Firebase
Semua halaman memakai `FF.db` di `storage.js`. Ganti isi objek ini dengan `FirebaseAdapter` berinterface sama (list/get/add/upd/del, setTx, status, settings, session, log). FirebaseAdapter **belum diimplementasikan**.
1. **Authentication**: Email/Password; hapus passHash dan akun demo. Role admin lewat custom claims.
2. **Database**: Cloud Firestore (query laporan, filter tanggal, indeks) lebih cocok daripada Realtime Database.
3. **Security Rules**: member hanya baca/ubah dokumennya; status transaksi & masa aktif hanya admin (atau Cloud Function). Jangan pernah aturan baca/tulis terbuka.
4. Persetujuan pembayaran sebaiknya Cloud Function/transaksi atomik.
5. Audit log ditulis server-side; aktifkan backup/export terjadwal Firestore.
6. Jangan taruh service account/private key di frontend.
