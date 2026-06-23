# Project Design Guidelines - Military Exchange Report

This document contains "Protected Formatting" rules that must be strictly followed when modifying the report generation logic in `PainelGestor.tsx`.

## 1. PDF Header Layout
- **Title**: Multi-line centered title ("DIRETORIA DE SAÚDE" and "RELATÓRIO DE PERMUTAS").
- **Logos**: Sized at exactly `logoSize = 55`.
- **Positioning**: 
  - Left logo: `x=45, y=20`.
  - Right logo: `x=pageWidth - 45 - logoSize, y=20`.
- **Separators**: A subtle double line drawn at `y=85` and `y=88` using `setDrawColor(200, 200, 200)`.

## 2. Table Formatting (PDF)
- **Cell Alignment**: Mandatory centralization for all data columns (`halign: 'center', valign: 'middle'`).
- **Column 0 (Turno)**: `cellWidth: 45`.
- **Column 1 (Data)**: `cellWidth: 55`.
- **Columns 2 & 3**: Automatic width.
- **Column 4 (Homologação)**: Fixed width `120`, font size `6.5`.

## 3. Militar Formating (`formatMilitarRelatorio`)
- Display pattern: `[RANK] [NUMERAL] [NAME]`.
- **Numeral Rule**: Numeral (Badge number) MUST be displayed ONLY for: `ST, 1ºSGT, 2ºSGT, 3ºSGT, CB, SD`.
- **Name Rule**: Use the cleaned Guerra Name (remove the rank prefix if present) and convert to UPPERCASE.

## 4. Logical Constraints
- **Filtering**: Only permutas with status `APROVADO` (homologated) should appear in reports.
- **Sorting**: Mandatory chronological sorting by `dataRealizacao`.
