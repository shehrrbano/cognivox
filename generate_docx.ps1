
$mdPath = 'C:\Users\omen\Desktop\Cognivox\milestone_report.md'
$docxPath = Join-Path -Path $env:USERPROFILE -ChildPath 'Downloads\Milestone1_Report.docx'

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Add()
$selection = $word.Selection

$lines = Get-Content $mdPath

foreach ($line in $lines) {
    $trimmed = $line.Trim()
    
    if ($trimmed.StartsWith('# ')) {
        $selection.Style = 'Heading 1'
        $selection.TypeText($trimmed.Substring(2))
        $selection.TypeParagraph()
        $selection.Style = 'Normal'
    }
    elseif ($trimmed.StartsWith('## ')) {
        $selection.Style = 'Heading 2'
        $selection.TypeText($trimmed.Substring(3))
        $selection.TypeParagraph()
        $selection.Style = 'Normal'
    }
    elseif ($trimmed.StartsWith('### ')) {
        $selection.Style = 'Heading 3'
        $selection.TypeText($trimmed.Substring(4))
        $selection.TypeParagraph()
        $selection.Style = 'Normal'
    }
    elseif ($trimmed.StartsWith('* ')) {
        $selection.Range.ListFormat.ApplyBulletDefault()
        $selection.TypeText($trimmed.Substring(2))
        $selection.TypeParagraph()
        $selection.Range.ListFormat.RemoveNumbers()
    }
    else {
        if ($trimmed -ne '') {
            $selection.TypeText($line)
        }
        $selection.TypeParagraph()
    }
}

try {
    $doc.SaveAs($docxPath)
    Write-Host "File saved to: $docxPath"
} catch {
    Write-Host "Error saving file: $($_.Exception.Message)"
} finally {
    $doc.Close([ref]0)
    $word.Quit()
}
