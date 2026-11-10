package com.mathkn.island;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

/** Math Island: opens https://mathkn.fun full screen. All code and data stay on the website and Firebase. */
public class MainActivity extends Activity {
    private static final String HOME = "https://mathkn.fun/";
    private static final int PICK = 7;
    private WebView web;
    private ValueCallback<Uri[]> picker;
    private boolean failed;

    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setUserAgentString(s.getUserAgentString() + " MathIslandApp/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl(); String h = u.getHost() == null ? "" : u.getHost();
                boolean mine = h.equals("mathkn.fun") || h.endsWith(".mathkn.fun") || h.endsWith("firebaseapp.com") || h.endsWith("google.com") || h.endsWith("gstatic.com");
                if (mine && ("https".equals(u.getScheme()))) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }
            @Override public void onPageStarted(WebView v, String url, Bitmap f) { failed = false; }
            @Override public void onReceivedError(WebView v, WebResourceRequest r, WebResourceError e) {
                if (r.isForMainFrame()) {
                    failed = true;
                    v.loadDataWithBaseURL(null, "<meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:sans-serif;text-align:center;padding:48px 24px;color:#334'><h2>No internet</h2><p>Math Island needs a connection.</p><p><a href='" + HOME + "' style='display:inline-block;margin-top:12px;padding:12px 22px;background:#2563eb;color:#fff;border-radius:10px;text-decoration:none'>Try again</a></p>", "text/html", "utf-8", null);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (picker != null) picker.onReceiveValue(null);
                picker = cb;
                try { startActivityForResult(p.createIntent(), PICK); }
                catch (Exception e) { picker = null; return false; }
                return true;
            }
        });

        if (b != null) web.restoreState(b); else web.loadUrl(HOME);
    }

    @Override protected void onActivityResult(int req, int res, Intent data) {
        if (req == PICK && picker != null) {
            picker.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            picker = null;
        } else super.onActivityResult(req, res, data);
    }

    @Override protected void onSaveInstanceState(Bundle o) { super.onSaveInstanceState(o); web.saveState(o); }
    @Override public void onBackPressed() { if (web.canGoBack() && !failed) web.goBack(); else super.onBackPressed(); }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
}
