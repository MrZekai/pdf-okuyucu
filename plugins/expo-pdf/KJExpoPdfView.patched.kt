package com.kishannareshpal.expopdf

import android.content.Context
import android.graphics.Color
import android.graphics.Rect
import android.net.Uri
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView
import com.github.barteksc.pdfviewer.PDFView
import com.github.barteksc.pdfviewer.util.Constants
import expo.modules.kotlin.viewevent.EventDispatcher
import java.io.FileNotFoundException
import androidx.core.net.toUri
import com.github.barteksc.pdfviewer.util.SnapEdge
import com.kishannareshpal.expopdf.lib.FitMode

class KJExpoPdfView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  companion object {
    internal const val DEFAULT_PAGING_ENABLED = false
    internal const val DEFAULT_DOUBLE_TAP_ZOOM_ENABLED = true
    internal const val DEFAULT_HORIZONTAL_MODE_ENABLED = false
    internal const val DEFAULT_PAGE_GAP = 0
    internal const val DEFAULT_AUTO_SCALE_ENABLED = true
    internal val DEFAULT_CONTENT_PADDING = Rect(0, 0, 0, 0)
    internal val DEFAULT_FIT_MODE = FitMode.both
    internal val DEFAULT_PAGE_COLOR_INVERTED_ENABLED = false

    /**
     * QA fix (BUG-17): every page opened blurred, with characters colliding and
     * overrunning their rules, until the reader was pinched.
     *
     * The viewer draws a page twice. First a whole page "thumbnail" rendered at
     * THUMBNAIL_RATIO of the display size and stretched to fill, then the sharp
     * layer, tile by tile. Upstream renders that first layer at 30 per cent, so
     * the state the reader actually opens on is a quarter resolution image of a
     * dense text page. A pinch forces the sharp tiles and the page "repairs
     * itself", which is exactly what the reports described.
     *
     * Raising the first layer part way, to 60 per cent, was not enough and was
     * the wrong shape of fix. It left the same page looking heavy on one open
     * and crisp on the next, depending on which layer won the race - which is
     * worse than a consistent defect, because the reader cannot trust what they
     * see. The first layer is therefore rendered at FULL resolution: preview and
     * sharp layer become visually identical at 1x zoom, so there is no longer a
     * race to observe. The page may appear a fraction later, but it always
     * appears the same way.
     *
     * The thumbnail cache is cut from 8 to 6 to pay for it: each cached preview
     * is now a screen sized bitmap rather than a ninth of one.
     *
     * Values:
     *  - first layer at full resolution, so both layers look the same
     *  - fewer cached previews, to bound the memory that costs
     *  - a larger tile cache, so the sharp layer survives scrolling
     *
     * PRELOAD_OFFSET is deliberately LEFT AT ITS DEFAULT, and raising it is a
     * trap worth recording. PagesLoader walks the preload area first and stops
     * as soon as the number of rendered tiles reaches CACHE_SIZE:
     *
     *     parts += loadPage(... CACHE_SIZE - parts);
     *     if (parts >= CACHE_SIZE) break;
     *
     * so a larger preload area spends the tile budget off screen and the page
     * the reader is actually looking at never gets its sharp tiles. Raising it
     * to 60 made text on screen look heavy and smeared - the stretched preview
     * layer - which is the opposite of the fix.
     *
     * PART_SIZE is left alone too: enlarging tiles is what would really
     * threaten memory, and it is not needed here.
     */
    private const val SHARP_THUMBNAIL_RATIO = 1.0f
    private const val THUMBNAIL_CACHE_SIZE = 6
    private const val TILE_CACHE_SIZE = 180

    /**
     * The values are global to the library and CACHE_SIZE is read while PDFView
     * is being constructed, so they are applied from the companion initialiser.
     * That runs when the class is first loaded, before any instance and its
     * PDFView exist; applying them from the instance init block would be too
     * late for the cache. A failure here must never stop a document from
     * opening, so the worst case is the blurred first layer the app already
     * shipped with.
     */
    init {
      try {
        Constants.THUMBNAIL_RATIO = SHARP_THUMBNAIL_RATIO
        Constants.Cache.THUMBNAILS_CACHE_SIZE = THUMBNAIL_CACHE_SIZE
        Constants.Cache.CACHE_SIZE = TILE_CACHE_SIZE
      } catch (_: Throwable) {
        // Keep the upstream defaults rather than failing to render at all.
      }
    }
  }

  private val onLoadComplete by EventDispatcher()
  private val onPageChanged by EventDispatcher()
  private val onError by EventDispatcher()

  internal enum class ErrorCode(val code: String) {
    invalidUri("invalid_uri"),
    invalidDocument("invalid_document"),
    passwordRequired("password_required"),
    passwordIncorrect("password_incorrect")
  }

  private var uri: Uri? = null
  private var password: String? = null
  private var isPagingEnabled: Boolean = DEFAULT_PAGING_ENABLED
  private var isDoubleTapZoomEnabled: Boolean = DEFAULT_DOUBLE_TAP_ZOOM_ENABLED
  private var isHorizontalModeEnabled: Boolean = DEFAULT_HORIZONTAL_MODE_ENABLED
  private var pageGap: Int = DEFAULT_PAGE_GAP
  private var contentPadding: Rect = DEFAULT_CONTENT_PADDING
  private var fitMode: FitMode = DEFAULT_FIT_MODE
  private var autoScaleEnabled: Boolean = DEFAULT_AUTO_SCALE_ENABLED
  private var isPageColorInverted: Boolean = DEFAULT_PAGE_COLOR_INVERTED_ENABLED

  // QA fix (BUG-06): the logical page the reader is currently on. The underlying
  // viewer restores a proportional scroll offset after a resize, which turns a
  // rotation into an apparently random page jump. Remembering the page index and
  // re-applying it as the default page keeps the logical position stable.
  private var lastPageIndex: Int = 0

  internal val pdfView = PDFView(context, null).apply {
    layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
  }

  init {
    // Set the primitive PdfView's content background to transparent so that it inherits
    // the color from the React Native view (ExpoView), as defined by the
    // style prop in the component (`style={{ backgroundColor: '#eee' }}`).
    this.pdfView.setBackgroundColor(Color.TRANSPARENT)

    addView(this.pdfView)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    this.pdfView.recycle()
  }

  fun setUri(uri: String?) {
    if (uri == null) {
      this.reportError(ErrorCode.invalidUri, "No URI provided")
      return
    }

    try {
      val parsedUri = uri.toUri()
      if (this.uri != parsedUri) {
        this.lastPageIndex = 0
      }
      this.uri = parsedUri
    } catch (_: Exception) {
      this.reportError(ErrorCode.invalidUri, "The provided URI is invalid")
    }

    this.reloadPdf()
  }

  fun setPassword(password: String?) {
    this.password = password;
    this.reloadPdf()
  }

  fun setPagingEnabled(enabled: Boolean?) {
    this.isPagingEnabled = enabled ?: DEFAULT_PAGING_ENABLED
    this.reloadPdf()
  }

  fun setDoubleTapZoomEnabled(enabled: Boolean?) {
    this.isDoubleTapZoomEnabled = enabled ?: DEFAULT_DOUBLE_TAP_ZOOM_ENABLED
    this.pdfView.enableDoubletap(this.isDoubleTapZoomEnabled)
  }

  fun setHorizontalModeEnabled(enabled: Boolean?) {
    this.isHorizontalModeEnabled = enabled ?: DEFAULT_HORIZONTAL_MODE_ENABLED
    this.reloadPdf()
  }

  fun setPageGap(pageGap: Int?) {
    this.pageGap = pageGap ?: DEFAULT_PAGE_GAP
    this.reloadPdf()
  }

  fun setContentPadding(rect: Rect?) {
    this.contentPadding = rect ?: DEFAULT_CONTENT_PADDING
    this.reloadPdf()
  }

  fun setFitMode(mode: FitMode?) {
    this.fitMode = mode ?: DEFAULT_FIT_MODE
    this.reloadPdf()
  }

  fun setPageColorInverted(enabled: Boolean?) {
    this.isPageColorInverted = enabled ?: DEFAULT_PAGE_COLOR_INVERTED_ENABLED
    this.reloadPdf()
  }

  fun setAutoScaleEnabled(enabled: Boolean?) {
    this.autoScaleEnabled = enabled ?: DEFAULT_AUTO_SCALE_ENABLED
    this.reloadPdf()
  }

  /**
   * QA fix (BUG-14): jump to a logical page index.
   *
   * The jump is applied through the very same defaultPage path that the resize
   * restore uses, so vertical, horizontal and post-rotation behaviour stay
   * identical and no additional viewer API is required. A null value is ignored
   * so JavaScript can clear the prop after a jump without triggering a reload,
   * and a jump to the current page is a no-op.
   */
  fun setPage(page: Int?) {
    val target = page ?: return
    if (target < 0) return
    if (target == this.lastPageIndex) return
    this.lastPageIndex = target
    this.reloadPdf()
  }

  private fun reloadPdf() {
    if (!this.pdfView.isRecycled) {
      this.pdfView.recycle()
    }

    val currentUri = this.uri ?: return

    val pdfBuilder = try {
      if (currentUri.scheme == "content") {
        val contentResolver = context.contentResolver
        val inputStream = contentResolver.openInputStream(currentUri)
          ?: throw FileNotFoundException("Could not open input stream for the provided URI: $currentUri")
        this.pdfView.fromStream(inputStream)
      } else {
        this.pdfView.fromUri(currentUri)
      }
    } catch (e: Exception) {
      this.reportError(ErrorCode.invalidDocument, e.message.toString())
      return
    }

    pdfBuilder
      .pageFitPolicy(this.fitMode.toFitPolicy())
      .enableDoubletap(this.isDoubleTapZoomEnabled)
      .swipeHorizontal(this.isHorizontalModeEnabled)
      .nightMode(this.isPageColorInverted)
      .spacing(this.pageGap)
      .autoCenterOnResize(this.autoScaleEnabled)
      .defaultPage(this.lastPageIndex)
      .contentPadding(
        this.contentPadding.left,
        this.contentPadding.top,
        this.contentPadding.right,
        this.contentPadding.bottom
      )
      .onLoad { pageCount ->
        this.onLoadComplete(
          mapOf(
            "pageCount" to pageCount
          )
        )
      }
      .onPageChange { pageIndex, pageCount ->
        this.lastPageIndex = pageIndex
        this.onPageChanged(
          mapOf(
            "pageIndex" to pageIndex,
            "pageCount" to pageCount
          )
        )
      }

    // QA fix (BUG-02): the upstream implementation deliberately loaded the
    // document once without a password, waited for the "password required"
    // failure and then re-ran load() on the very same builder with the password
    // attached. For a content:// document that builder owns an InputStream that
    // the first attempt already consumed, so the retry decoded an empty buffer
    // and every correct password was reported back as incorrect. The password is
    // now attached before the single load attempt instead.
    val providedPassword = this.password
    if (!providedPassword.isNullOrEmpty()) {
      pdfBuilder.password(providedPassword)
    }

    post {
      pdfBuilder
        .onError { e ->
          // QA fix (BUG-03): upstream only reacted to the "password required"
          // failure and silently swallowed every other decode error, which left
          // truncated or corrupted documents on an endless loading state. Every
          // failure is now reported back to JavaScript.
          val message = e.message.orEmpty()
          if (message.lowercase().contains("password")) {
            if (providedPassword.isNullOrEmpty()) {
              this.reportError(
                ErrorCode.passwordRequired,
                "PDF requires a password, but no password was provided"
              )
            } else {
              this.reportError(
                ErrorCode.passwordIncorrect,
                "The provided password was incorrect"
              )
            }
          } else {
            this.reportError(
              ErrorCode.invalidDocument,
              message.ifEmpty { "The PDF document could not be opened" }
            )
          }
        }
        .load()
    }
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)

    // QA fix (BUG-06): only react to a real resize (rotation / multi-window),
    // never to the very first layout pass, so the document is not loaded twice.
    if (oldw == 0 || oldh == 0) return
    if (w == oldw && h == oldh) return
    if (this.uri == null) return

    this.reloadPdf()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    if (!this.pdfView.isRecycled) {
      this.reloadPdf()
    }
  }

  private fun reportError(error: ErrorCode, message: String) {
    this.onError(
      mapOf(
        "code" to error.code,
        "message" to message
      )
    )
  }
}
