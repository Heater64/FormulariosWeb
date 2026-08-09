package com.formsbiblicos.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.StatFs;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {
    private static final long MAX_APK_BYTES = 250L * 1024L * 1024L;
    private static final long RESERVED_BYTES = 10L * 1024L * 1024L;
    private static final int MAX_REDIRECTS = 5;
    private static final String APK_MIME = "application/vnd.android.package-archive";
    private static final String APK_NAME = "formsbiblicos-update.apk";
    private static final String PART_NAME = APK_NAME + ".part";

    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile Future<?> downloadTask;
    private volatile HttpURLConnection activeConnection;

    @PluginMethod
    public void downloadAndInstall(final PluginCall call) {
        String rawUrl = call.getString("apkUrl", "");
        String expectedSha256 = call.getString("sha256", null);
        String expectedVersion = call.getString("expectedVersion", null);
        Long expectedVersionCode = call.getLong("expectedVersionCode", null);
        Long expectedSize = call.getLong("sizeBytes", null);

        if (!isInitialReleaseUrl(rawUrl)) {
            reject(call, "INVALID_URL", "La APK debe proceder de una URL HTTPS de GitHub Releases.");
            return;
        }
        if (expectedVersion == null || expectedVersionCode == null || expectedVersionCode < 1) {
            reject(call, "INVALID_VERSION", "Faltan los datos de versión esperados para la APK.");
            return;
        }
        if (expectedSha256 != null && !expectedSha256.matches("(?i)^[a-f0-9]{64}$")) {
            reject(call, "INVALID_CHECKSUM", "El checksum SHA-256 no es válido.");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !getContext().getPackageManager().canRequestPackageInstalls()) {
            openUnknownSourcesSettings();
            JSObject result = new JSObject();
            result.put("status", "unknown_sources_required");
            call.resolve(result);
            return;
        }

        synchronized (this) {
            if (downloadTask != null && !downloadTask.isDone()) {
                reject(call, "DOWNLOAD_IN_PROGRESS", "Ya hay una descarga de actualización en curso.");
                return;
            }
            downloadTask = executor.submit(() -> downloadAndStartInstaller(
                call, rawUrl, expectedSha256, expectedVersion, expectedVersionCode, expectedSize
            ));
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        Future<?> task = downloadTask;
        HttpURLConnection connection = activeConnection;
        if (connection != null) connection.disconnect();
        if (task != null) task.cancel(true);
        JSObject result = new JSObject();
        result.put("status", "cancelled");
        call.resolve(result);
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        boolean opened = openUnknownSourcesSettings();
        JSObject result = new JSObject();
        result.put("status", opened ? "settings_opened" : "settings_unavailable");
        call.resolve(result);
    }

    // Versión REAL instalada en el sistema (versionName/versionCode del APK).
    // Es la fuente de verdad para comparar con el manifiesto: si el build quedó
    // obsoleto (p.ej. assets viejos con otro __FB_APP_VERSION__ inyectado), la
    // app no debe ofrecer una actualización fantasma ni entrar en un bucle de
    // "siempre hay actualización".
    @PluginMethod
    public void getInstalledVersion(PluginCall call) {
        try {
            PackageInfo info = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            long versionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
            JSObject result = new JSObject();
            result.put("versionName", info.versionName);
            result.put("versionCode", versionCode);
            call.resolve(result);
        } catch (PackageManager.NameNotFoundException error) {
            call.reject("UNAVAILABLE", "No se pudo leer la versión instalada.");
        }
    }

    private void downloadAndStartInstaller(
        PluginCall call,
        String rawUrl,
        String expectedSha256,
        String expectedVersion,
        long expectedVersionCode,
        Long expectedSize
    ) {
        File apkFile = null;
        try {
            File updateDir = new File(getContext().getCacheDir(), "updates");
            if (!updateDir.exists() && !updateDir.mkdirs()) {
                throw new UpdateException("STORAGE_ERROR", "No se pudo preparar el almacenamiento temporal.");
            }
            apkFile = new File(updateDir, APK_NAME);
            File partFile = new File(updateDir, PART_NAME);
            deleteQuietly(apkFile);
            deleteQuietly(partFile);

            long requiredBytes = expectedSize != null && expectedSize > 0 ? expectedSize : RESERVED_BYTES;
            StatFs stats = new StatFs(updateDir.getPath());
            if (stats.getAvailableBytes() < requiredBytes + RESERVED_BYTES) {
                throw new UpdateException("INSUFFICIENT_STORAGE", "No hay espacio suficiente para la actualización.");
            }

            IOException lastNetworkError = null;
            for (int attempt = 1; attempt <= 3; attempt++) {
                try {
                    downloadOnce(new URL(rawUrl), partFile, expectedSize);
                    lastNetworkError = null;
                    break;
                } catch (IOException error) {
                    if (Thread.currentThread().isInterrupted()) {
                        throw new UpdateException("DOWNLOAD_CANCELLED", "Descarga cancelada.");
                    }
                    lastNetworkError = error;
                    deleteQuietly(partFile);
                    if (attempt < 3) {
                        try { Thread.sleep(attempt * 500L); }
                        catch (InterruptedException interrupted) {
                            Thread.currentThread().interrupt();
                            throw new UpdateException("DOWNLOAD_CANCELLED", "Descarga cancelada.");
                        }
                    }
                }
            }
            if (lastNetworkError != null) {
                throw new UpdateException("NETWORK_ERROR", "No se pudo descargar la APK.", lastNetworkError);
            }

            if (!partFile.renameTo(apkFile)) {
                throw new UpdateException("STORAGE_ERROR", "No se pudo completar el archivo temporal.");
            }
            if (!looksLikeApk(apkFile)) {
                throw new UpdateException("INCOMPLETE_DOWNLOAD", "El archivo descargado no es una APK válida.");
            }
            if (expectedSha256 != null && !hasSha256(apkFile, expectedSha256)) {
                throw new UpdateException("CHECKSUM_MISMATCH", "El checksum SHA-256 de la APK no coincide.");
            }
            verifyPackage(apkFile, expectedVersion, expectedVersionCode);
            openPackageInstaller(apkFile);

            JSObject result = new JSObject();
            result.put("status", "installer_opened");
            result.put("fileSize", apkFile.length());
            call.resolve(result);
        } catch (UpdateException error) {
            if (apkFile != null) deleteQuietly(apkFile);
            reject(call, error.code, error.getMessage());
        } catch (Exception error) {
            if (apkFile != null) deleteQuietly(apkFile);
            reject(call, "INSTALL_ERROR", "No se pudo preparar la instalación.");
        } finally {
            activeConnection = null;
        }
    }

    private void downloadOnce(URL initialUrl, File destination, Long expectedSize) throws IOException, UpdateException {
        URL url = initialUrl;
        HttpURLConnection connection = null;
        try {
            for (int redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
                if (redirect == 0 && !isInitialReleaseUrl(url.toString())) {
                    throw new UpdateException("INVALID_URL", "La URL inicial no pertenece a GitHub Releases.");
                }
                connection = (HttpURLConnection) url.openConnection();
                activeConnection = connection;
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(20000);
                connection.setRequestProperty("Accept", APK_MIME + ", application/octet-stream");
                connection.setRequestProperty("User-Agent", "FormsBiblicos-Android-Updater");
                int status = connection.getResponseCode();
                if (status >= 300 && status < 400) {
                    String location = connection.getHeaderField("Location");
                    connection.disconnect();
                    if (location == null) throw new IOException("Redirección sin destino");
                    url = new URL(url, location);
                    if (!isSafeRedirectUrl(url)) throw new UpdateException("INVALID_REDIRECT", "GitHub devolvió una redirección no permitida.");
                    continue;
                }
                if (status < 200 || status >= 300) throw new IOException("HTTP " + status);

                String contentType = connection.getContentType();
                if (contentType != null && contentType.toLowerCase(Locale.ROOT).startsWith("text/html")) {
                    throw new UpdateException("INVALID_CONTENT", "La descarga no devolvió una APK.");
                }
                long contentLength = connection.getContentLengthLong();
                if (contentLength > MAX_APK_BYTES) throw new UpdateException("APK_TOO_LARGE", "La APK supera el tamaño permitido.");
                if (expectedSize != null && expectedSize > 0 && contentLength > 0 && contentLength != expectedSize) {
                    throw new UpdateException("INCOMPLETE_DOWNLOAD", "El tamaño recibido no coincide con el anunciado.");
                }

                try (InputStream input = new BufferedInputStream(connection.getInputStream());
                     OutputStream output = new BufferedOutputStream(new FileOutputStream(destination))) {
                    byte[] buffer = new byte[64 * 1024];
                    long downloaded = 0;
                    long lastNotification = 0;
                    int read;
                    while ((read = input.read(buffer)) != -1) {
                        if (Thread.currentThread().isInterrupted()) {
                            throw new UpdateException("DOWNLOAD_CANCELLED", "Descarga cancelada.");
                        }
                        downloaded += read;
                        if (downloaded > MAX_APK_BYTES) throw new UpdateException("APK_TOO_LARGE", "La APK supera el tamaño permitido.");
                        output.write(buffer, 0, read);
                        long now = System.currentTimeMillis();
                        if (now - lastNotification > 100 || (contentLength > 0 && downloaded == contentLength)) {
                            notifyProgress(downloaded, contentLength);
                            lastNotification = now;
                        }
                    }
                    output.flush();
                    if (contentLength > 0 && downloaded != contentLength) {
                        throw new UpdateException("INCOMPLETE_DOWNLOAD", "La descarga terminó antes de recibir todos los bytes.");
                    }
                    notifyProgress(downloaded, contentLength);
                }
                return;
            }
            throw new UpdateException("TOO_MANY_REDIRECTS", "La descarga tuvo demasiadas redirecciones.");
        } finally {
            if (connection != null) connection.disconnect();
            activeConnection = null;
        }
    }

    private void notifyProgress(long downloaded, long total) {
        JSObject progress = new JSObject();
        progress.put("downloadedBytes", downloaded);
        progress.put("totalBytes", total > 0 ? total : 0);
        progress.put("percent", total > 0 ? Math.min(100, Math.round((downloaded * 100d) / total)) : 0);
        getActivity().runOnUiThread(() -> notifyListeners("downloadProgress", progress));
    }

    private void verifyPackage(File apkFile, String expectedVersion, long expectedVersionCode) throws UpdateException {
        PackageManager manager = getContext().getPackageManager();
        PackageInfo info = manager.getPackageArchiveInfo(apkFile.getAbsolutePath(), 0);
        if (info == null || !getContext().getPackageName().equals(info.packageName)) {
            throw new UpdateException("INVALID_APK", "La APK no pertenece a FormsBiblicos.");
        }
        long actualVersionCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P ? info.getLongVersionCode() : info.versionCode;
        if (!expectedVersion.equals(info.versionName) || actualVersionCode != expectedVersionCode) {
            throw new UpdateException("VERSION_MISMATCH", "La versión de la APK no coincide con el manifiesto.");
        }
        // Causa típica de "tengo que desinstalar para actualizar": la APK
        // INSTALADA está firmada con otra clave (p.ej. una build de prueba
        // local con keystore debug) o la descarga trae una versión MÁS
        // ANTIGUA que la instalada (caché del navegador). Android rechaza
        // instalar en ambos casos sin explicarlo. Aquí se detecta ANTES de
        // abrir el instalador y se avisa con un mensaje claro.
        verifySignaturesMatch(apkFile);
        verifyIsNewer(apkFile, actualVersionCode);
    }

    private void verifyIsNewer(File apkFile, long expectedVersionCode) throws UpdateException {
        try {
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
            PackageManager manager = getContext().getPackageManager();
            PackageInfo instalada = manager.getPackageInfo(getContext().getPackageName(), flags);
            long instaladoCode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? instalada.getLongVersionCode() : instalada.versionCode;
            if (instaladoCode > expectedVersionCode) {
                throw new UpdateException(
                    "OLD_DOWNLOAD",
                    "El archivo descargado es más antiguo que la app instalada (¿caché del navegador?). Borra la APK de Descargas y vuelve a descargarla."
                );
            }
        } catch (PackageManager.NameNotFoundException notInstalled) {
            // Primera instalación
        }
    }

    private void verifySignaturesMatch(File apkFile) throws UpdateException {
        try {
            int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.P
                ? PackageManager.GET_SIGNING_CERTIFICATES
                : PackageManager.GET_SIGNATURES;
            PackageManager manager = getContext().getPackageManager();
            PackageInfo nuevo = manager.getPackageArchiveInfo(apkFile.getAbsolutePath(), flags);
            PackageInfo instalada = manager.getPackageInfo(getContext().getPackageName(), flags);
            if (nuevo == null) return; // no se pudieron leer firmas; el instalador decidirá
            if (!mismaFirma(firmasDe(nuevo), firmasDe(instalada))) {
                throw new UpdateException(
                    "SIGNATURE_MISMATCH",
                    "La app instalada tiene otra firma (¿versión de prueba?). Desinstálala e instala la oficial desde la web."
                );
            }
        } catch (PackageManager.NameNotFoundException notInstalled) {
            // Primera instalación: no hay firma previa con la que comparar
        }
    }

    private Signature[] firmasDe(PackageInfo info) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && info.signingInfo != null) {
            Signature[] firmas = info.signingInfo.getApkContentsSigners();
            if (firmas != null && firmas.length > 0) return firmas;
        }
        return info.signatures;
    }

    private boolean mismaFirma(Signature[] a, Signature[] b) {
        if (a == null || b == null || a.length == 0 || b.length == 0) return false;
        for (Signature x : a) for (Signature y : b) if (x.equals(y)) return true;
        return false;
    }

    private boolean looksLikeApk(File file) throws IOException {
        try (InputStream input = new FileInputStream(file)) {
            return input.read() == 'P' && input.read() == 'K';
        }
    }

    private boolean hasSha256(File file, String expected) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (InputStream input = new BufferedInputStream(new FileInputStream(file))) {
            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = input.read(buffer)) != -1) digest.update(buffer, 0, read);
        }
        StringBuilder actual = new StringBuilder();
        for (byte value : digest.digest()) actual.append(String.format(Locale.ROOT, "%02x", value));
        return actual.toString().equalsIgnoreCase(expected);
    }

    private void openPackageInstaller(File apkFile) throws Exception {
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, APK_MIME);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
    }

    private boolean openUnknownSourcesSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
            return true;
        } catch (Exception error) {
            return false;
        }
    }

    private boolean isInitialReleaseUrl(String raw) {
        try {
            URL url = new URL(raw);
            return "https".equalsIgnoreCase(url.getProtocol())
                && "github.com".equalsIgnoreCase(url.getHost())
                && url.getPath().toLowerCase(Locale.ROOT).startsWith("/heater64/formulariosweb/releases/download/")
                && url.getPath().toLowerCase(Locale.ROOT).endsWith(".apk");
        } catch (Exception error) {
            return false;
        }
    }

    private boolean isSafeRedirectUrl(URL url) {
        if (!"https".equalsIgnoreCase(url.getProtocol())) return false;
        String host = url.getHost().toLowerCase(Locale.ROOT);
        return host.equals("github.com")
            || host.equals("objects.githubusercontent.com")
            || host.equals("release-assets.githubusercontent.com")
            || host.equals("github-releases.githubusercontent.com");
    }

    private void reject(PluginCall call, String code, String message) {
        call.reject(message, code);
    }

    private void deleteQuietly(File file) {
        if (file != null && file.exists()) file.delete();
    }

    @Override
    protected void handleOnDestroy() {
        HttpURLConnection connection = activeConnection;
        if (connection != null) connection.disconnect();
        executor.shutdownNow();
        super.handleOnDestroy();
    }

    private static class UpdateException extends Exception {
        final String code;
        UpdateException(String code, String message) { super(message); this.code = code; }
        UpdateException(String code, String message, Throwable cause) { super(message, cause); this.code = code; }
    }
}
