# 대본(sample-meeting.txt)을 Windows 한국어 음성으로 읽어 WAV 파일로 만든다.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$scriptPath = Join-Path $PSScriptRoot 'sample-meeting.txt'
$outputPath = Join-Path $PSScriptRoot 'sample-meeting.wav'
$lines = Get-Content -Path $scriptPath -Encoding UTF8 | Where-Object { $_.Trim() }

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice('Microsoft Heami Desktop')
    # 언어를 지정하지 않으면 영어로 처리되어 한국어를 건너뛴다.
    $korean = [System.Globalization.CultureInfo]::GetCultureInfo('ko-KR')
    $prompt = New-Object System.Speech.Synthesis.PromptBuilder($korean)
    foreach ($line in $lines) {
        $prompt.AppendText($line)
        # 발언 사이를 띄워 사람들이 차례로 말하는 것처럼 들리게 한다.
        $prompt.AppendBreak([TimeSpan]::FromMilliseconds(800))
    }

    # 음성 인식에 충분하면서 파일이 작은 16kHz 모노 형식으로 저장한다.
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
        16000,
        [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen,
        [System.Speech.AudioFormat.AudioChannel]::Mono
    )
    $synth.SetOutputToWaveFile($outputPath, $format)
    $synth.Speak($prompt)
    $synth.SetOutputToNull()
}
finally {
    $synth.Dispose()
}

Write-Output "만들었습니다: $outputPath"
