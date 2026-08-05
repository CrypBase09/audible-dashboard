Add-Type -AssemblyName System.Drawing
foreach ($groesse in 192, 512) {
  $b = New-Object System.Drawing.Bitmap $groesse, $groesse
  $g = [System.Drawing.Graphics]::FromImage($b)
  $g.SmoothingMode = "AntiAlias"
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml("#171310"))
  $orange = [System.Drawing.ColorTranslator]::FromHtml("#f8991c")
  $stift = New-Object System.Drawing.Pen $orange, ($groesse * 0.09)
  $stift.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $stift.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawArc($stift, $groesse * 0.2, $groesse * 0.22, $groesse * 0.6, $groesse * 0.6, 180, 180)
  $pinsel = New-Object System.Drawing.SolidBrush $orange
  foreach ($x in ($groesse * 0.14), ($groesse * 0.66)) {
    $rect = New-Object System.Drawing.RectangleF $x, ($groesse * 0.5), ($groesse * 0.2), ($groesse * 0.3)
    $pfad = New-Object System.Drawing.Drawing2D.GraphicsPath
    $r = $groesse * 0.06
    $pfad.AddArc($rect.X, $rect.Y, $r, $r, 180, 90)
    $pfad.AddArc($rect.Right - $r, $rect.Y, $r, $r, 270, 90)
    $pfad.AddArc($rect.Right - $r, $rect.Bottom - $r, $r, $r, 0, 90)
    $pfad.AddArc($rect.X, $rect.Bottom - $r, $r, $r, 90, 90)
    $pfad.CloseFigure()
    $g.FillPath($pinsel, $pfad)
  }
  $g.Dispose()
  New-Item -ItemType Directory -Force icons | Out-Null
  $b.Save("icons/icon-$groesse.png", [System.Drawing.Imaging.ImageFormat]::Png)
  $b.Dispose()
}
Write-Output "Icons erzeugt"
