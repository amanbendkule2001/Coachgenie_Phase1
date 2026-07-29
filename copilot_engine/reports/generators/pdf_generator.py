# # copilot_engine/reports/generators/pdf_generator.py

# from pathlib import Path
# from datetime import datetime
# from typing import Optional, List

# from fastapi import HTTPException

# from reportlab.platypus import (
#     SimpleDocTemplate,
#     Paragraph,
#     Spacer,
#     ListFlowable,
#     ListItem,
# )

# from reportlab.lib.styles import (
#     StyleSheet1,
#     ParagraphStyle,
# )

# from reportlab.lib.pagesizes import A4

# from reportlab.lib.enums import (
#     TA_CENTER,
#     TA_LEFT,
# )

# from reportlab.lib import colors

# import markdown2

# from copilot_engine.core.logging_config import (
#     logging,
# )

# logger = logging.getLogger(__name__)


# class PDFGenerator:

#     OUTPUT_DIR = "generated_reports"

#     # =====================================================
#     # PUBLIC GENERATOR
#     # =====================================================

#     @classmethod
#     def generate(
#         cls,
#         *,
#         content: str,
#         filename: Optional[str] = None,
#     ) -> str:

#         try:

#             # =====================================================
#             # OUTPUT DIRECTORY
#             # =====================================================

#             BASE_DIR = Path.cwd()

#             output_dir = BASE_DIR / cls.OUTPUT_DIR

#             output_dir.mkdir(
#                 parents=True,
#                 exist_ok=True,
#             )

#             # =====================================================
#             # FILENAME
#             # =====================================================

#             if not filename:

#                 timestamp = datetime.utcnow().strftime(
#                     "%Y%m%d_%H%M%S"
#                 )

#                 filename = f"report_{timestamp}"

#             if not filename.endswith(".pdf"):
#                 filename += ".pdf"

#             file_path = output_dir / filename

#             # =====================================================
#             # DOCUMENT
#             # =====================================================

#             document = SimpleDocTemplate(
#                 str(file_path),
#                 pagesize=A4,
#                 rightMargin=40,
#                 leftMargin=40,
#                 topMargin=50,
#                 bottomMargin=40,
#             )

#             # =====================================================
#             # STYLES
#             # =====================================================

#             styles = cls._build_styles()

#             # =====================================================
#             # MARKDOWN → HTML
#             # =====================================================

#             html_content = markdown2.markdown(content)

#             # =====================================================
#             # STORY
#             # =====================================================

#             story: List = []

#             lines = html_content.split("\n")

#             bullet_items = []

#             for line in lines:

#                 line = line.strip()

#                 if not line:
#                     continue

#                 # =================================================
#                 # H1 TITLE
#                 # =================================================

#                 if line.startswith("<h1>"):

#                     text = (
#                         line.replace("<h1>", "")
#                         .replace("</h1>", "")
#                     )

#                     story.append(
#                         Paragraph(
#                             text,
#                             styles["CustomTitle"],
#                         )
#                     )

#                     story.append(
#                         Spacer(1, 18)
#                     )

#                     continue

#                 # =================================================
#                 # H2 HEADINGS
#                 # =================================================

#                 if line.startswith("<h2>"):

#                     text = (
#                         line.replace("<h2>", "")
#                         .replace("</h2>", "")
#                     )

#                     story.append(
#                         Paragraph(
#                             text,
#                             styles["CustomHeading"],
#                         )
#                     )

#                     story.append(
#                         Spacer(1, 12)
#                     )

#                     continue

#                 # =================================================
#                 # BULLET POINTS
#                 # =================================================

#                 if "<li>" in line:

#                     bullet_text = (
#                         line.replace("<li>", "")
#                         .replace("</li>", "")
#                     )

#                     bullet_items.append(
#                         ListItem(
#                             Paragraph(
#                                 bullet_text,
#                                 styles["CustomBody"],
#                             )
#                         )
#                     )

#                     continue

#                 # =================================================
#                 # CLOSE BULLET LIST
#                 # =================================================

#                 if bullet_items:

#                     story.append(
#                         ListFlowable(
#                             bullet_items,
#                             bulletType="bullet",
#                             leftIndent=20,
#                         )
#                     )

#                     story.append(
#                         Spacer(1, 10)
#                     )

#                     bullet_items = []

#                 # =================================================
#                 # PARAGRAPHS
#                 # =================================================

#                 if line.startswith("<p>"):

#                     text = (
#                         line.replace("<p>", "")
#                         .replace("</p>", "")
#                     )

#                     story.append(
#                         Paragraph(
#                             text,
#                             styles["CustomBody"],
#                         )
#                     )

#                     story.append(
#                         Spacer(1, 10)
#                     )

#                     continue

#             # =====================================================
#             # FINAL BULLET FLUSH
#             # =====================================================

#             if bullet_items:

#                 story.append(
#                     ListFlowable(
#                         bullet_items,
#                         bulletType="bullet",
#                         leftIndent=20,
#                     )
#                 )

#             # =====================================================
#             # BUILD PDF
#             # =====================================================

#             document.build(story)

#             logger.info(
#                 "PDF generated successfully",
#                 extra={
#                     "file_path": str(file_path),
#                 },
#             )

#             return str(
#                 file_path.resolve()
#             )

#         except Exception:

#             logger.exception(
#                 "Failed to generate PDF report"
#             )

#             raise HTTPException(
#                 status_code=500,
#                 detail=(
#                     "PDF generation failed. "
#                     "Check server logs."
#                 ),
#             )

#     # =====================================================
#     # STYLES
#     # =====================================================

#     @classmethod
#     def _build_styles(cls):

#         styles = StyleSheet1()

#         # =====================================================
#         # TITLE
#         # =====================================================

#         styles.add(
#             ParagraphStyle(
#                 name="CustomTitle",
#                 fontSize=22,
#                 leading=28,
#                 alignment=TA_CENTER,
#                 textColor=colors.HexColor("#111827"),
#                 spaceAfter=20,
#             )
#         )

#         # =====================================================
#         # HEADINGS
#         # =====================================================

#         styles.add(
#             ParagraphStyle(
#                 name="CustomHeading",
#                 fontSize=16,
#                 leading=22,
#                 alignment=TA_LEFT,
#                 textColor=colors.HexColor("#1F2937"),
#                 spaceBefore=10,
#                 spaceAfter=12, 
#             )
#         )

#         # =====================================================
#         # BODY
#         # =====================================================

#         styles.add(
#             ParagraphStyle(
#                 name="CustomBody",
#                 fontSize=11,
#                 leading=20,
#                 alignment=TA_LEFT,
#                 textColor=colors.black,
#             )
#         )

#         return styles
    
# copilot_engine/reports/generators/pdf_generator.py

from pathlib import Path
from datetime import datetime
from typing import Optional, List

from fastapi import HTTPException

import markdown2

from reportlab.lib import colors
from reportlab.lib.enums import (
    TA_CENTER,
    TA_LEFT,
)

from reportlab.lib.pagesizes import A4

from reportlab.lib.styles import (
    ParagraphStyle,
    StyleSheet1,
)

from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    ListFlowable,
    ListItem,
    Table,
    TableStyle,
)

from reportlab.pdfbase.pdfmetrics import stringWidth

from bs4 import BeautifulSoup
from bs4.element import Tag
from reportlab.graphics.shapes import Drawing, Line

from copilot_engine.core.logging_config import logging

logger = logging.getLogger(__name__)


class PDFGenerator:
    """
    Production-grade PDF Generator.

    Responsibilities
    ----------------
    • Create professional reports
    • Apply consistent branding
    • Manage page templates
    • Render markdown (Phase 2)
    • Support tables & charts (Phase 3)
    """

    OUTPUT_DIR = "generated_reports"

    PAGE_SIZE = A4

    LEFT_MARGIN = 45
    RIGHT_MARGIN = 45
    TOP_MARGIN = 60
    BOTTOM_MARGIN = 50

    REPORT_NAME = "Coach Genie AI"

    # ==========================================================
    # PUBLIC
    # ==========================================================

    @classmethod
    def generate(
        cls,
        *,
        content: str,
        filename: Optional[str] = None,
    ) -> str:

        try:

            file_path = cls._prepare_output(filename)

            styles = cls._build_styles()

            document = cls._build_document(file_path)

            story: List = []

            # --------------------------------------------------
            # Markdown conversion
            # (Rendering comes in Phase 2)
            # --------------------------------------------------

            html = markdown2.markdown(
                content,
                extras=[
                    "tables",
                    "fenced-code-blocks",
                    "strike",
                    "task_list",
                ],
            )

            story = cls._render_html(
                html,
                styles,
            )

            document.build(
                story,
                onFirstPage=cls._draw_header_footer,
                onLaterPages=cls._draw_header_footer,
            )

            logger.info(
                "PDF generated successfully.",
                extra={
                    "path": str(file_path),
                },
            )

            return str(file_path.resolve())

        except Exception:

            logger.exception(
                "Failed to generate PDF."
            )

            raise HTTPException(
                status_code=500,
                detail="Unable to generate PDF report.",
            )

    # ==========================================================
    # DOCUMENT
    # ==========================================================

    @classmethod
    def _build_document(
        cls,
        file_path: Path,
    ) -> SimpleDocTemplate:

        return SimpleDocTemplate(
            str(file_path),
            pagesize=cls.PAGE_SIZE,
            leftMargin=cls.LEFT_MARGIN,
            rightMargin=cls.RIGHT_MARGIN,
            topMargin=cls.TOP_MARGIN,
            bottomMargin=cls.BOTTOM_MARGIN,
            title="Coach Genie Report",
            author=cls.REPORT_NAME,
        )

    # ==========================================================
    # OUTPUT
    # ==========================================================

    @classmethod
    def _prepare_output(
        cls,
        filename: Optional[str],
    ) -> Path:

        output_dir = (
            Path.cwd()
            / cls.OUTPUT_DIR
        )

        output_dir.mkdir(
            parents=True,
            exist_ok=True,
        )

        if not filename:

            filename = (
                f"report_"
                f"{datetime.utcnow():%Y%m%d_%H%M%S}"
            )

        if not filename.endswith(".pdf"):
            filename += ".pdf"

        return output_dir / filename

    # ==========================================================
    # PAGE TEMPLATE
    # ==========================================================

    @classmethod
    def _draw_header_footer(
        cls,
        canvas,
        document,
    ):

        canvas.saveState()

        width, height = cls.PAGE_SIZE

        # ======================================================
        # HEADER
        # ======================================================

        canvas.setStrokeColor(
            colors.HexColor("#D1D5DB")
        )

        canvas.setLineWidth(0.5)

        canvas.line(
            cls.LEFT_MARGIN,
            height - 45,
            width - cls.RIGHT_MARGIN,
            height - 45,
        )

        canvas.setFont(
            "Helvetica-Bold",
            11,
        )

        canvas.setFillColor(
            colors.HexColor("#111827")
        )

        canvas.drawString(
            cls.LEFT_MARGIN,
            height - 32,
            cls.REPORT_NAME,
        )

        # ======================================================
        # FOOTER
        # ======================================================

        canvas.setStrokeColor(
            colors.HexColor("#D1D5DB")
        )

        canvas.line(
            cls.LEFT_MARGIN,
            35,
            width - cls.RIGHT_MARGIN,
            35,
        )

        canvas.setFont(
            "Helvetica",
            9,
        )

        canvas.setFillColor(
            colors.grey,
        )

        canvas.drawString(
            cls.LEFT_MARGIN,
            20,
            f"Generated on {datetime.now():%d %b %Y %H:%M}",
        )

        page = f"Page {document.page}"

        canvas.drawRightString(
            width - cls.RIGHT_MARGIN,
            20,
            page,
        )

        canvas.restoreState()

    # ==========================================================
    # STYLES
    # ==========================================================

    @classmethod
    def _build_styles(
        cls,
    ) -> StyleSheet1:

        styles = StyleSheet1()

        # ------------------------------------------------------
        # Cover Title
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="CoverTitle",
                fontName="Helvetica-Bold",
                fontSize=24,
                leading=32,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#111827"),
                spaceAfter=30,
            )
        )

        # ------------------------------------------------------
        # Title
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Title",
                fontName="Helvetica-Bold",
                fontSize=20,
                leading=28,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#111827"),
                spaceAfter=22,
            )
        )

        # ------------------------------------------------------
        # Heading 1
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Heading1",
                fontName="Helvetica-Bold",
                fontSize=17,
                leading=24,
                textColor=colors.HexColor("#1F2937"),
                spaceBefore=18,
                spaceAfter=10,
            )
        )

        # ------------------------------------------------------
        # Heading 2
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Heading2",
                fontName="Helvetica-Bold",
                fontSize=15,
                leading=22,
                textColor=colors.HexColor("#374151"),
                spaceBefore=14,
                spaceAfter=8,
            )
        )

        # ------------------------------------------------------
        # Heading 3
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Heading3",
                fontName="Helvetica-Bold",
                fontSize=13,
                leading=20,
                textColor=colors.HexColor("#4B5563"),
                spaceBefore=12,
                spaceAfter=6,
            )
        )

        # ------------------------------------------------------
        # Metadata
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Metadata",
                fontName="Helvetica",
                fontSize=10,
                leading=16,
                textColor=colors.HexColor("#4B5563"),
                spaceAfter=5,
            )
        )

        # ------------------------------------------------------
        # Body
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Body",
                fontName="Helvetica",
                fontSize=11,
                leading=20,
                textColor=colors.black,
                alignment=TA_LEFT,
                spaceAfter=10,
            )
        )

        # ------------------------------------------------------
        # Bullet
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Bullet",
                parent=styles["Body"],
                leftIndent=18,
                bulletIndent=8,
            )
        )

        # ------------------------------------------------------
        # Caption
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Caption",
                fontName="Helvetica-Oblique",
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER,
                spaceBefore=4,
            )
        )

        # ------------------------------------------------------
        # Footer
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Footer",
                fontName="Helvetica",
                fontSize=9,
                textColor=colors.grey,
                alignment=TA_CENTER,
            )
        )

        return styles
    
        # ------------------------------------------------------
        # Quote
        # ------------------------------------------------------

        styles.add(
            ParagraphStyle(
                name="Quote",
                parent=styles["Body"],
                fontName="Helvetica-Oblique",
                textColor=colors.HexColor("#4B5563"),
                leftIndent=20,
                spaceAfter=10,
            )
        )
    
    @classmethod
    def _render_html(
        cls,
        html: str,
        styles,
    ) -> List:

        soup = BeautifulSoup(
            html,
            "html.parser",
        )

        story = []

        for element in soup.children:

            cls._render_element(
                element,
                story,
                styles,
            )

        return story
    
    @classmethod
    def _render_element(
        cls,
        element,
        story,
        styles,
    ):

        if not isinstance(element, Tag):
            return

        tag = element.name

        if tag == "h1":
            cls._render_heading(
                element,
                story,
                styles["Title"],
            )

        elif tag == "h2":
            cls._render_heading(
                element,
                story,
                styles["Heading1"],
            )

        elif tag == "h3":
            cls._render_heading(
                element,
                story,
                styles["Heading2"],
            )

        elif tag == "h4":
            cls._render_heading(
                element,
                story,
                styles["Heading3"],
            )

        elif tag == "p":
            cls._render_paragraph(
                element,
                story,
                styles,
            )

        elif tag in ("ul", "ol"):
            cls._render_list(
                element,
                story,
                styles,
            )

        elif tag == "hr":
            cls._render_divider(
                story,
            )

        elif tag == "blockquote":
            cls._render_quote(
                element,
                story,
                styles,
            )
            
    @classmethod
    def _render_heading(
        cls,
        element,
        story,
        style,
    ):

        story.append(
            Paragraph(
                element.get_text(strip=True),
                style,
            )
        )

        story.append(
            Spacer(1, 8)
        )
        
    @classmethod
    def _render_paragraph(
        cls,
        element,
        story,
        styles,
    ):

        story.append(
            Paragraph(
                str(element.decode_contents()),
                styles["Body"],
            )
        )

        story.append(
            Spacer(1, 8)
        )
        
    @classmethod
    def _render_list(
        cls,
        element,
        story,
        styles,
    ):

        items = []

        for li in element.find_all(
            "li",
            recursive=False,
        ):

            items.append(
                ListItem(
                    Paragraph(
                        li.decode_contents(),
                        styles["Body"],
                    )
                )
            )

        story.append(
            ListFlowable(
                items,
                bulletType="bullet",
                leftIndent=20,
            )
        )

        story.append(
            Spacer(1, 8)
        )
        
    @classmethod
    def _render_divider(
        cls,
        story,
    ):

        drawing = Drawing(
            450,
            1,
        )

        drawing.add(
            Line(
                0,
                0,
                450,
                0,
            )
        )

        story.append(drawing)

        story.append(
            Spacer(1, 10)
        )
        
    @classmethod
    def _render_quote(
        cls,
        element,
        story,
        styles,
    ):

        story.append(
            Paragraph(
                element.decode_contents(),
                styles["Quote"],
            )
        )

        story.append(
            Spacer(1, 8)
        )