# 대본(meeting-60min.txt)의 발언을 한 줄씩 Windows 한국어 음성으로 읽어 임시 폴더에 WAV 파일로 저장한다.
# 이어 붙이기와 화자별 목소리 변화는 generate-meeting-60min.mjs가 맡는다.
param([Parameter(Mandatory = $true)][string]$OutputDir)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

# 목소리를 낮추면 말도 느려지므로, 낮은 목소리의 화자일수록 빠르게 읽어 둔다.
$rates = @{ '지훈' = 1; '서연' = 0; '민재' = 1; '하늘' = -1; '태경' = 2 }

$scriptPath = Join-Path $PSScriptRoot 'meeting-60min.txt'
$lines = Get-Content -Path $scriptPath -Encoding UTF8 | Where-Object { $_.Trim() -and -not $_.StartsWith('#') }

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    16000,
    [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
    [System.Speech.AudioFormat.AudioChannel]::Mono
)
$korean = [System.Globalization.CultureInfo]::GetCultureInfo('ko-KR')

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice('Microsoft Heami Desktop')
    $index = 0
    foreach ($line in $lines) {
        $speaker, $text = $line -split '\|', 2
        $synth.Rate = $rates[$speaker]
        # 언어를 지정하지 않으면 영어로 처리되어 한국어를 건너뛴다.
        $prompt = New-Object System.Speech.Synthesis.PromptBuilder($korean)
        $prompt.AppendText($text)
        $synth.SetOutputToWaveFile((Join-Path $OutputDir ('{0:D4}.wav' -f $index)), $format)
        $synth.Speak($prompt)
        $index++
    }
    $synth.SetOutputToNull()
}
finally {
    $synth.Dispose()
}
