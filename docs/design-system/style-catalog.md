# Landscape Style Catalog (As-Is)

Plain-English inventory of existing UI styles. This is documentation only (no CSS changes).

Assumptions:
- Values are for light theme unless noted.
- Swatches are inline; printing will capture current colors.

Legend:
- Hex values are explicit; RGBA uses `#RRGGBBAA`.

<table data-style-table="true" style="width:100%;border-collapse:collapse;">
  <thead>
    <tr>
      <th data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Component</th>
      <th data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Swatch</th>
      <th data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Used for</th>
      <th data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Background</th>
      <th data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Text</th>
      <th data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Border</th>
      <th data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Hover</th>
      <th data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Active</th>
      <th data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;text-align:left;">Dark theme</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="9" style="border:1px solid var(--cui-border-color);padding:8px;background:var(--cui-tertiary-bg);font-weight:600;">Buttons</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Primary Button (`.btn.btn-primary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#0EA5E9;color:#FFFFFF;border:1px solid #0EA5E9;">Primary</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">primary actions (save/submit)</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#0C8CC6</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#4645AB</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Secondary Button (`.btn.btn-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#6B7785;color:#FFFFFF;border:1px solid #6B7785;">Secondary</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">secondary actions (cancel/close)</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7785</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7785</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#5B6571</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#565F6A</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Success Button (`.btn.btn-success`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#1B9E3E;color:#080A0C;border:1px solid #1B9E3E;">Success</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">confirm/positive actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#1B9E3E</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#080A0C</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#1B9E3E</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#3DAD5B</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#49B165</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #57C68A33, text #57C68A</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Danger Button (`.btn.btn-danger`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#E55353;color:#080A0C;border:1px solid #E55353;">Danger</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">destructive actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E55353</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#080A0C</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E55353</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#E96D6D</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#EA7575</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #E6407233, text #E64072</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Warning Button (`.btn.btn-warning`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#F9B115;color:#080A0C;border:1px solid #F9B115;">Warning</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">warning states/actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F9B115</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#080A0C</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#F9B115</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#FABD38</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#FAC144</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #F2C40D33, text #F2C40D</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Info Button (`.btn.btn-info`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#3399FF;color:#080A0C;border:1px solid #3399FF;">Info</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">info/neutral actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#3399FF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#080A0C</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#3399FF</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#52A8FF</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#5CADFF</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Outline Secondary (`.btn.btn-outline-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#FFFFFF;color:#6B7785;border:1px solid #6B7785;">Outline</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lighter secondary actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7785</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7785</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #6B7785, text #FFFFFF</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Outline Primary (`.btn.btn-outline-primary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#FFFFFF;color:#5856D6;border:1px solid #5856D6;">Outline</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">primary actions without fill</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#5856D6</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#5856D6</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #5856D6, text #FFFFFF</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Ghost Primary (`.btn.btn-ghost-primary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:transparent;color:#0F172A;border:1px dashed #E5E7EB;">Ghost</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">low-emphasis actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E91A, text #0EA5E9</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E91A, text #0EA5E9</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Ghost Secondary (`.btn.btn-ghost-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:transparent;color:#0F172A;border:1px dashed #E5E7EB;">Ghost</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">low-emphasis neutral actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #F7F7FB</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #F7F7FB</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Ghost Danger (`.btn.btn-ghost-danger`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:transparent;color:#E55353;border:1px dashed #E55353;">Ghost</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">low-emphasis destructive actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#E55353</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #E55353, text #080A0C</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Link Button (`.btn.btn-link`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 4px;border-radius:6px;background:transparent;color:#5856D6;">Link</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline text actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#5856D6</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">underline</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Close Button (`.btn-close`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;width:20px;height:20px;border-radius:4px;background:#FFFFFF;border:1px solid #E5E7EB;color:#0F172A;text-align:center;line-height:18px;">×</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">modal close icon</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#000000</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">opacity 0.75</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">icon #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Taxonomy Secondary Button (`.btn-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#F7F7FB;color:#0F172A;border:1px solid #E5E7EB;">Taxonomy</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">taxonomy header actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">border #0EA5E9</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Taxonomy Edit Icon (`.btn-edit`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px 8px;border-radius:4px;background:transparent;color:#0EA5E9;border:1px dashed #E5E7EB;">✎</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline edit icon</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #F7F7FB</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Taxonomy Icon Button (`.btn-icon`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px;border-radius:4px;background:transparent;color:#475569;border:1px dashed #E5E7EB;">◻</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">icon-only actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">text #0F172A</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Property Add/Edit/Save (`.btn-add`, `.btn-edit`, `.btn-save`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:4px;background:#0078D4;color:#FFFFFF;border:1px solid #0078D4;">Primary</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">property unit actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0078D4</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#0078D4</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#106EBE</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">#005A9E</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Property Remove Button (`.btn-remove`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:4px;background:transparent;color:#D13438;border:1px solid #D13438;">Remove</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">remove unit type</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#D13438</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#D13438</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #D13438, text #FFFFFF</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Save Button (`.ops-save-button`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#0EA5E9;color:#FFFFFF;border:1px solid #0EA5E9;">Save</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Operations tab save</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">brightness(1.1)</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Add Buttons (`.ops-add-btn`, `.ops-inline-add`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px 10px;border-radius:5px;background:transparent;color:#475569;border:1px dashed #E5E7EB;">Add</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Operations add-row actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E91A, text #0EA5E9</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Primary Button (`.studio-btn.studio-btn-primary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:8px;background:#0EA5E9;color:#FFFFFF;border:1px solid #0EA5E9;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio primary actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#0C8CC6</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Secondary Button (`.studio-btn.studio-btn-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:8px;background:transparent;color:#0F172A;border:1px solid #E5E7EB;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio secondary actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#0000000A</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Ghost Button (`.studio-btn.studio-btn-ghost`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:8px;background:transparent;color:#475569;border:1px dashed #E5E7EB;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio low-emphasis actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#0000000A</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Danger Button (`.studio-btn.studio-btn-danger`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:8px;background:#DC2626;color:#FFFFFF;border:1px solid #DC2626;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio destructive actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#DC2626</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#DC2626</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#BB2020</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Landscaper Button (`.btn-landscaper`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#00D9FF;color:#002B36;border:1px solid #00D9FF;">Landscaper</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Landscaper flyout actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#00D9FF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#002B36</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#00D9FF</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#00B8D9</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lease Primary Button (`.btn-primary` in `src/styles/lease.css`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#6366F1;color:#FFFFFF;border:1px solid #6366F1;">Lease</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lease header actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#6366F1</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#4F46E5</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lease Success Button (`.btn-success` in `src/styles/lease.css`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#10B981;color:#FFFFFF;border:1px solid #10B981;">Lease</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lease header actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#10B981</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lease Outline Secondary (`.btn-outline-secondary` in `src/styles/lease.css`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 14px;border-radius:6px;background:#FFFFFF;color:#6B7280;border:1px solid #E5E7EB;">Lease</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lease header actions</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7280</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">border #D1D5DB</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>

    <tr>
      <td colspan="9" style="border:1px solid var(--cui-border-color);padding:8px;background:var(--cui-tertiary-bg);font-weight:600;">Badges &amp; Pills</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Primary (`.badge.bg-primary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#0EA5E9;color:#FFFFFF;">Primary</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Secondary (`.badge.bg-secondary`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#6B7785;color:#FFFFFF;">Secondary</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#6B7785</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Success (`.badge.bg-success`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#57C68A;color:#FFFFFF;">Success</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Danger (`.badge.bg-danger`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#E64072;color:#FFFFFF;">Danger</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E64072</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Warning (`.badge.bg-warning`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#F2C40D;color:#FFFFFF;">Warning</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Badge Info (`.badge.bg-info`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#7A80EC;color:#FFFFFF;">Info</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">status chips/counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #FFFFFF</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Subtle Badge (Info example)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#7A80EC0D;color:#184C77;border:1px solid #7A80EC1A;">Subtle</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">low-contrast status chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC0D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#184C77</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC1A</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Filter Badge (`.filter-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#0EA5E91A;color:#0EA5E9;">Filter</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">filter chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E91A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Budget Category Badge (`.budget-category-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#7A80EC1A;color:#184C77;">Info</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">budget category labels</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC1A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#184C77</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Budget Mode Badge (Napkin)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#57C68A;color:#FFFFFF;border:2px solid #57C68A;">Napkin</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">budget mode selector</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Budget Mode Badge (Standard)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#F2C40D;color:#000000;border:2px solid #F2C40D;">Standard</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">budget mode selector</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#000000</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Budget Mode Badge (Detail)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:4px 10px;border-radius:6px;background:#E64072;color:#FFFFFF;border:2px solid #E64072;">Detail</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">budget mode selector</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E64072</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E64072</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Channel Pill (`.channel-pill`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 10px;border-radius:999px;background:#F7F7FB;color:#0F172A;border:1px solid #E5E7EB;">Pill</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">feed/channel filters</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">border uses `--pill-color`</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E9, text #FFFFFF</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #F7F7FB, text #0F172A</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Pill (`.ops-pill`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#F7F7FB;color:#475569;border:1px solid #E5E7EB;">Ops</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Ops header meta pills</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Badge Global (`.ops-badge.global`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#F7F7FB;color:#475569;border:1px solid #E5E7EB;">Global</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Ops growth badges</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Badge Custom (`.ops-badge.custom`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#F6AD5514;color:#F6AD55;border:1px solid #F6AD55;">Custom</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Ops growth badges</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F6AD5514</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#F6AD55</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#F6AD55</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Operations Badge Fee (`.ops-badge.fee`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;background:#68D39114;color:#68D391;border:1px solid #68D391;">Fee</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Ops growth badges</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#68D39114</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#68D391</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#68D391</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Unclassified Badge (`.unclassified-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#EF4444;color:#FFFFFF;">Unclassified</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Ops unclassified highlight</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#EF4444</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">System Badge (`.system-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:12px;background:#FEF3C7;color:#92400E;">System</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">taxonomy system labels</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FEF3C7</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#92400E</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Tag Badge (`.tag-badge`, `.tag-badge-more`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#F7F7FB;color:#475569;">Tag</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">category tags</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lifecycle Badge Acquisition (`.lifecycle-badge[data-stage="Acquisition"]`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#57C68A;color:#FFFFFF;">A</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lifecycle stage</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lifecycle Badge Development (`.lifecycle-badge[data-stage="Development"]`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#0EA5E9;color:#FFFFFF;">D</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lifecycle stage</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lifecycle Badge Operations (`.lifecycle-badge[data-stage="Operations"]`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#7A80EC;color:#FFFFFF;">O</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lifecycle stage</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lifecycle Badge Disposition (`.lifecycle-badge[data-stage="Disposition"]`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#F2C40D;color:#000000;">D</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lifecycle stage</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#000000</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">text #000000</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Lifecycle Badge Financing (`.lifecycle-badge[data-stage="Financing"]`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#E64072;color:#FFFFFF;">F</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">lifecycle stage</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E64072</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Tree Node Badge (`.tree-node-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:10px;background:#7A80EC1A;color:#7A80EC;">12</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">category tree counts</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC1A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">UOM Category Badge (`.uom-category-badge`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 6px;border-radius:4px;background:#6B77855C;color:#FFFFFF;border:1px solid #6B778599;">UOM</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">UOM category labels</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#6B77855C</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#6B778599</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Badge Success (`.studio-badge-success`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#16A34A1A;color:#16A34A;border:1px solid #16A34A4C;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio status chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#16A34A1A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#16A34A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#16A34A4C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Badge Warning (`.studio-badge-warning`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#CA8A041A;color:#CA8A04;border:1px solid #CA8A044C;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio status chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#CA8A041A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#CA8A04</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#CA8A044C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Badge Error (`.studio-badge-error`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#DC26261A;color:#DC2626;border:1px solid #DC26264C;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio status chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#DC26261A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#DC2626</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#DC26264C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Studio Badge Info (`.studio-badge-info`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#2563EB1A;color:#2563EB;border:1px solid #2563EB4C;">Studio</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">Studio status chips</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#2563EB1A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#2563EB</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#2563EB4C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>

    <tr>
      <td colspan="9" style="border:1px solid var(--cui-border-color);padding:8px;background:var(--cui-tertiary-bg);font-weight:600;">Tiles &amp; Navigation</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Navigation Tile Active (`.nav-tile.nav-tile-active`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:8px;background:#2563EB;color:#FFFFFF;">Active</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">progressive breadcrumb tiles</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#2563EB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">no change</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Navigation Tile Inactive (`.nav-tile.nav-tile-inactive`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:8px;background:#F3F4F6;color:#374151;">Inactive</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">progressive breadcrumb tiles</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F3F4F6</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#374151</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">none</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">bg #1F2937, text #D1D5DB</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Planning Tile (`.planning-tile`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:8px 12px;border-radius:8px;background:#F7F7FB;color:#0F172A;border:2px solid #E5E7EB;">Tile</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">planning cards</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F7F7FB</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">border #0EA5E9</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E91A</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">outline #0EA5E933</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Parcel Tile Residential (`.parcel-tile--res`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:8px 12px;border-radius:8px;background:#16A34A;color:#FFFFFF;border:1px solid #FFFFFF33;">Parcel</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">parcel tiles</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#16A34A</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF33</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Parcel Tile Commercial (`.parcel-tile--com`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:8px 12px;border-radius:8px;background:#C2410C;color:#FFFFFF;border:1px solid #FFFFFF33;">Parcel</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">parcel tiles</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#C2410C</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF33</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Parcel Tile Other (`.parcel-tile--oth`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:8px 12px;border-radius:8px;background:#6366F1;color:#FFFFFF;border:1px solid #FFFFFF33;">Parcel</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">parcel tiles</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#6366F1</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF33</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Project Tab Button (`.project-tab-button`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-bottom:3px solid transparent;color:#475569;">Tab</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">top-level project tabs</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">transparent</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#475569</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">border-bottom transparent</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">bg #0EA5E90D</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">text #0EA5E9, border #0EA5E9</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>

    <tr>
      <td colspan="9" style="border:1px solid var(--cui-border-color);padding:8px;background:var(--cui-tertiary-bg);font-weight:600;">Alerts &amp; Notices</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Alert Info (`.alert.alert-info`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#7A80EC0D;color:#184C77;border:1px solid #7A80EC4C;">Info</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline feedback</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC0D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#184C77</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#7A80EC4C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Alert Success (`.alert.alert-success`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#57C68A0D;color:#0F5722;border:1px solid #57C68A4C;">Success</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline feedback</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A0D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F5722</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#57C68A4C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Alert Warning (`.alert.alert-warning`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#F2C40D0D;color:#764705;border:1px solid #F2C40D4C;">Warning</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline feedback</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D0D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#764705</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#F2C40D4C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">CoreUI Alert Danger (`.alert.alert-danger`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#E640720D;color:#671414;border:1px solid #E640724C;">Danger</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">inline feedback</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E640720D</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#671414</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E640724C</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Readonly Notice (`.readonly-notice`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#E0F2FE;color:#0C4A6E;border-left:4px solid #0EA5E9;">Notice</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">taxonomy notices</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#E0F2FE</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0C4A6E</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#0EA5E9 (left)</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Shadcn Alert Default (`Alert`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#FFFFFF;color:#0F172A;border:1px solid #E5E7EB;">Alert</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">document review/budget notices</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#0F172A</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#E5E7EB</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
    <tr>
      <td data-col="component" style="border:1px solid var(--cui-border-color);padding:8px;">Shadcn Alert Destructive (`Alert`)</td>
      <td data-col="swatch" style="border:1px solid var(--cui-border-color);padding:8px;"><span style="display:inline-block;padding:6px 10px;border-radius:6px;background:#FFFFFF;color:#DC2626;border:1px solid #DC262680;">Alert</span></td>
      <td data-col="used" style="border:1px solid var(--cui-border-color);padding:8px;">error notices</td>
      <td data-col="background" style="border:1px solid var(--cui-border-color);padding:8px;">#FFFFFF</td>
      <td data-col="text" style="border:1px solid var(--cui-border-color);padding:8px;">#DC2626</td>
      <td data-col="border" style="border:1px solid var(--cui-border-color);padding:8px;">#DC262680</td>
      <td data-col="hover" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="active" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
      <td data-col="dark" style="border:1px solid var(--cui-border-color);padding:8px;">—</td>
    </tr>
  </tbody>
</table>
