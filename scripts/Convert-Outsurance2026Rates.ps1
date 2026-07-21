param(
    [Parameter(Mandatory = $true)]
    [string]$InputPath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ZipXml {
    param(
        [System.IO.Compression.ZipArchive]$Archive,
        [string]$EntryName
    )

    $entry = $Archive.GetEntry($EntryName)
    if ($null -eq $entry) { throw "Workbook entry '$EntryName' was not found." }
    $reader = [System.IO.StreamReader]::new($entry.Open())
    try { return [xml]$reader.ReadToEnd() }
    finally { $reader.Dispose() }
}

function Get-CellText {
    param(
        [System.Xml.XmlElement]$Cell,
        [string[]]$SharedStrings
    )

    if ($null -eq $Cell) { return '' }
    if ($Cell.t -eq 's') { return $SharedStrings[[int]$Cell.v] }
    if ($Cell.t -eq 'inlineStr') { return [string]$Cell.is.t }
    return [string]$Cell.v
}

function Get-TradeDefinition {
    param(
        [string]$Section,
        [string]$Category,
        [string]$Description,
        [int]$Page
    )

    switch ($Section) {
        'SECTION A' { return @('inspection-assessing', 'Inspection & Assessing', 'Professional Services') }
        'SECTION B' { return @('geyser', 'Geyser', 'Plumbing') }
        'SECTION C' { return @('leak-detection', 'Leak Detection', 'Plumbing') }
        'SECTION D' { return @('general-plumbing', 'General Plumbing', 'Plumbing') }
        'SECTION F' { return @('built-in-cupboards', 'Built-in Cupboards', 'Building') }
        'SECTION G' { return @('metal-steel', 'Metal & Steel', 'Building') }
        'SECTION I' { return @('air-conditioning', 'Air-conditioning', 'Specialist Services') }
        'SECTION J' { return @('borehole-pumps', 'Borehole Pumps', 'Specialist Services') }
        'SECTION K' { return @('swimming-pools', 'Swimming Pools', 'Specialist Services') }
        'SECTION H' {
            if ($Category -match '^SECURITY') {
                return @('gate-garage-motors', 'Gate & Garage Motors', 'Electrical & Security')
            }
            return @('electrical-security', 'Electrical & Security', 'Electrical & Security')
        }
        'SECTION E' {
            if ($Category -match 'THATCH') { return @('thatching', 'Thatching', 'Roofing') }
            if ($Category -match 'CARPENTER|JOINER') { return @('carpentry-doors', 'Carpentry & Doors', 'Building') }
            if ($Category -match 'FENCING|WALLING') { return @('fencing-walling', 'Fencing & Walling', 'Building') }
            if ($Category -match 'TREE') { return @('tree-removal', 'Tree Removal', 'Building') }
            if ($Category -match 'EMERGENCY') { return @('emergency-work', 'Emergency Work', 'Building') }
            if ($Page -ge 29 -and $Page -le 31) { return @('ceilings-painting', 'Ceilings & Painting', 'Building') }
            if ($Page -eq 32) { return @('tiling', 'Tiling', 'Building') }
            if ($Page -ge 33 -and $Page -le 35) { return @('roofing-waterproofing', 'Roofing & Waterproofing', 'Roofing') }
            return @('general-building', 'General Building', 'Building')
        }
        default { throw "Unsupported workbook section '$Section'." }
    }
}

function Get-CleanCategory {
    param(
        [string]$Section,
        [string]$Category,
        [string]$TradeName,
        [int]$Page
    )

    if ($Section -eq 'SECTION E' -and $Category -eq 'START-UP FEE') {
        if ($Page -eq 29) { return 'Ceilings' }
        if ($Page -eq 30) { return 'Ceilings & Painting' }
        if ($Page -eq 31) { return 'Painting' }
        if ($Page -eq 32) { return 'Tiling' }
        return 'Building Work'
    }
    if ($Section -eq 'SECTION F' -and $Category -eq 'MINIMUM BIC FEE') { return 'Built-in Cupboards' }
    if ($Section -eq 'SECTION G') { return 'Metal & Steel' }
    return (Get-Culture).TextInfo.ToTitleCase($Category.Trim().ToLowerInvariant())
}

function Get-PricingDefinition {
    param([string]$PricingBasis)

    $basis = $PricingBasis.Trim()
    if ($basis -match '(?i)cost\s*\+\s*(\d+(?:\.\d+)?)\s*%') {
        return @('cost-plus', [decimal]::Parse($Matches[1], [Globalization.CultureInfo]::InvariantCulture))
    }
    if ($basis -match '(?i)quote\s*\+\s*(\d+(?:\.\d+)?)\s*%') {
        return @('cost-plus', [decimal]::Parse($Matches[1], [Globalization.CultureInfo]::InvariantCulture))
    }
    if ($basis -match '(?i)^cost$') { return @('cost', $null) }
    if ($basis -match '(?i)calculate|quote') { return @('manual', $null) }
    return @('fixed', $null)
}

function Get-AutomaticFeeCode {
    param(
        [string]$Section,
        [string]$Category,
        [string]$Description,
        [string]$TradeCode,
        [int]$Page
    )

    switch ($TradeCode) {
        'general-plumbing' { return 'OUT26-STARTUP-PLUMBING' }
        'geyser' {
            if ($Category -match 'ONCE-OFF FAULT|MATERIALS') { return 'OUT26-STARTUP-PLUMBING' }
        }
        'general-building' {
            if ($Page -ge 24 -and $Page -le 26 -and $Description -notmatch '(?i)excavat|compact|concrete') {
                return 'OUT26-STARTUP-BUILDING'
            }
        }
        'ceilings-painting' { return 'OUT26-STARTUP-CEILINGS-PAINTING' }
        'tiling' { return 'OUT26-STARTUP-TILING' }
        'built-in-cupboards' { return 'OUT26-STARTUP-BIC' }
        'metal-steel' { return 'OUT26-STARTUP-METAL-STEEL' }
    }
    return $null
}

if (-not (Test-Path -LiteralPath $InputPath -PathType Leaf)) {
    throw "Workbook '$InputPath' was not found."
}

$archive = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $InputPath))
try {
    $sharedStringsXml = Get-ZipXml -Archive $archive -EntryName 'xl/sharedStrings.xml'
    $sharedStrings = @($sharedStringsXml.sst.si | ForEach-Object {
        if ($null -ne $_.t) { [string]$_.t }
        else { [string]::Join('', @($_.r | ForEach-Object { [string]$_.t })) }
    })
    $sheet = Get-ZipXml -Archive $archive -EntryName 'xl/worksheets/sheet1.xml'

    $rows = @()
    foreach ($row in $sheet.worksheet.sheetData.row) {
        $values = @{}
        foreach ($cell in $row.c) {
            $column = ([string]$cell.r) -replace '\d', ''
            $values[$column] = Get-CellText -Cell $cell -SharedStrings $sharedStrings
        }
        if ([string]$values['A'] -eq 'Section') { continue }

        $section = ([string]$values['A']).Trim().ToUpperInvariant()
        $category = ([string]$values['B']).Trim().ToUpperInvariant()
        $description = ([string]$values['C']).Trim()
        if ([string]::IsNullOrWhiteSpace($section) -or [string]::IsNullOrWhiteSpace($description)) { continue }

        $page = 0
        [void][int]::TryParse(([string]$values['G']).Trim(), [ref]$page)
        [decimal]$rate = 0
        [void][decimal]::TryParse(
            ([string]$values['E']).Trim(),
            [Globalization.NumberStyles]::Any,
            [Globalization.CultureInfo]::InvariantCulture,
            [ref]$rate)

        # Startup and minimum rows are system rules, never assessor-selectable catalogue items.
        if ($description -match '(?i)^\s*(start[ -]?up|minimum (bic )?fee)') { continue }
        # The workbook contains explanatory calculation examples in these sections.
        if ($description -match '(?i)\bvat\b|^\s*(example|subtotal|total)\b') { continue }
        if ($section -eq 'SECTION G') { continue }

        $trade = Get-TradeDefinition -Section $section -Category $category -Description $description -Page $page
        $pricingBasis = ([string]$values['F']).Trim()
        $notes = ([string]$values['I']).Trim()
        $pricing = Get-PricingDefinition -PricingBasis $pricingBasis
        $cleanCategory = Get-CleanCategory -Section $section -Category $category -TradeName $trade[1] -Page $page
        $feeCode = Get-AutomaticFeeCode -Section $section -Category $category -Description $description -TradeCode $trade[0] -Page $page

        $rows += [pscustomobject][ordered]@{
            itemCode = 'OUT26-{0}-{1:D4}' -f ($section -replace 'SECTION ', ''), [int]$row.r
            scheduleVersion = 2026
            section = $section
            tradeCode = $trade[0]
            tradeName = $trade[1]
            tradeGroup = $trade[2]
            category = $cleanCategory
            description = $description
            unit = if ([string]::IsNullOrWhiteSpace([string]$values['D'])) { 'item' } else { ([string]$values['D']).Trim() }
            rate = [decimal]::Round($rate, 2)
            pricingMode = $pricing[0]
            markupPercentage = $pricing[1]
            pricingNote = (@($pricingBasis, $notes) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) -and $_ -ne 'Fixed rate' }) -join ' · '
            automaticFeeCode = $feeCode
            systemGenerated = $false
            sortOrder = [int]$row.r
        }
    }

    $rows += [pscustomobject][ordered]@{
        itemCode = 'OUT26-G-METAL-WORK'
        scheduleVersion = 2026
        section = 'SECTION G'
        tradeCode = 'metal-steel'
        tradeName = 'Metal & Steel'
        tradeGroup = 'Building'
        category = 'Metal & Steel'
        description = 'Metal and steel work - calculated amount'
        unit = 'item'
        rate = [decimal]0
        pricingMode = 'manual'
        markupPercentage = $null
        pricingNote = 'Enter the calculated amount excluding VAT'
        automaticFeeCode = 'OUT26-STARTUP-METAL-STEEL'
        systemGenerated = $false
        sortOrder = 1
    }

    $startupFees = @(
        @('OUT26-STARTUP-PLUMBING', 'general-plumbing', 'General Plumbing', 'Plumbing', 'Start-up fee - plumbing / once-off geyser fault'),
        @('OUT26-STARTUP-BUILDING', 'general-building', 'General Building', 'Building', 'Start-up fee - general building'),
        @('OUT26-STARTUP-CEILINGS-PAINTING', 'ceilings-painting', 'Ceilings & Painting', 'Building', 'Start-up fee - ceilings and painting'),
        @('OUT26-STARTUP-TILING', 'tiling', 'Tiling', 'Building', 'Start-up fee - tiling'),
        @('OUT26-STARTUP-BIC', 'built-in-cupboards', 'Built-in Cupboards', 'Building', 'Start-up fee - built-in cupboards'),
        @('OUT26-STARTUP-METAL-STEEL', 'metal-steel', 'Metal & Steel', 'Building', 'Start-up fee - metal and steel')
    )
    foreach ($fee in $startupFees) {
        $rows += [pscustomobject][ordered]@{
            itemCode = $fee[0]
            scheduleVersion = 2026
            section = 'SYSTEM'
            tradeCode = $fee[1]
            tradeName = $fee[2]
            tradeGroup = $fee[3]
            category = 'Automatic Fees'
            description = $fee[4]
            unit = 'item'
            rate = [decimal]937.00
            pricingMode = 'fixed'
            markupPercentage = $null
            pricingNote = ''
            automaticFeeCode = $null
            systemGenerated = $true
            sortOrder = 0
        }
    }

    $target = [IO.Path]::GetFullPath($OutputPath)
    $targetDirectory = [IO.Path]::GetDirectoryName($target)
    if (-not [string]::IsNullOrWhiteSpace($targetDirectory)) {
        [IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
    }
    $rows | Sort-Object tradeGroup, tradeName, category, sortOrder |
        ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $target -Encoding utf8
    Write-Host "Wrote $($rows.Count) OUTsurance 2026 rate items to $target"
}
finally {
    $archive.Dispose()
}
