/**
 * 테스트 실행 도우미 스크립트
 * 다양한 테스트 시나리오를 실행하고 결과를 분석합니다.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface TestSuite {
  name: string
  pattern: string
  description: string
  timeout?: number
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'unit',
    pattern: 'src/**/__tests__/**/*.test.{ts,tsx}',
    description: '유닛 테스트 (스토어, 서비스, 훅)',
    timeout: 30000,
  },
  {
    name: 'integration',
    pattern: 'src/components/**/__tests__/**/*.test.{ts,tsx}',
    description: '통합 테스트 (컴포넌트)',
    timeout: 60000,
  },
  {
    name: 'e2e',
    pattern: 'src/test/e2e/**/*.test.{ts,tsx}',
    description: 'E2E 테스트 (사용자 플로우)',
    timeout: 120000,
  },
  {
    name: 'auth',
    pattern: 'src/**/*auth*.test.{ts,tsx}',
    description: '인증 관련 테스트',
    timeout: 45000,
  },
  {
    name: 'team',
    pattern: 'src/**/*team*.test.{ts,tsx}',
    description: '팀 관리 관련 테스트',
    timeout: 45000,
  },
]

class TestRunner {
  private results: Map<string, TestResult> = new Map()

  async runSuite(suite: TestSuite): Promise<TestResult> {
    console.log(
      `\n🧪 ${suite.name.toUpperCase()} 테스트 실행: ${suite.description}`
    )
    console.log('='.repeat(60))

    const startTime = Date.now()

    try {
      const command = `npx vitest run --reporter=json ${suite.pattern}`
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: suite.timeout || 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const result = this.parseTestOutput(output)
      const duration = Date.now() - startTime

      const testResult: TestResult = {
        suite: suite.name,
        success: result.success,
        total: result.total,
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        duration,
        coverage: result.coverage,
        errors: result.errors,
      }

      this.results.set(suite.name, testResult)
      this.printSuiteResult(testResult)

      return testResult
    } catch (error: any) {
      const duration = Date.now() - startTime
      const testResult: TestResult = {
        suite: suite.name,
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration,
        coverage: null,
        errors: [error.message],
      }

      this.results.set(suite.name, testResult)
      this.printSuiteResult(testResult)

      return testResult
    }
  }

  async runAll(): Promise<void> {
    console.log('🚀 GitHub Issue #13 테스트 실행 시작')
    console.log('대상: 사용자 인증 및 팀 관리 UI')
    console.log('='.repeat(80))

    const startTime = Date.now()

    for (const suite of TEST_SUITES) {
      await this.runSuite(suite)
    }

    const totalDuration = Date.now() - startTime
    this.printSummary(totalDuration)
    this.generateReport()
  }

  async runWithCoverage(): Promise<void> {
    console.log('📊 커버리지와 함께 모든 테스트 실행')
    console.log('='.repeat(60))

    try {
      const command = 'npx vitest run --coverage --reporter=json'
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 300000, // 5분
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      const result = this.parseTestOutput(output)
      this.printCoverageReport(result.coverage)
    } catch (error: any) {
      console.error('❌ 커버리지 테스트 실행 실패:', error.message)
    }
  }

  async runQuick(): Promise<void> {
    console.log('⚡ 빠른 테스트 실행 (유닛 테스트만)')
    console.log('='.repeat(50))

    const unitSuite = TEST_SUITES.find((s) => s.name === 'unit')
    if (unitSuite) {
      await this.runSuite(unitSuite)
    }
  }

  private parseTestOutput(output: string): ParsedTestResult {
    try {
      const jsonOutput = JSON.parse(output)

      return {
        success: jsonOutput.success || false,
        total: jsonOutput.numTotalTests || 0,
        passed: jsonOutput.numPassedTests || 0,
        failed: jsonOutput.numFailedTests || 0,
        skipped: jsonOutput.numPendingTests || 0,
        coverage: jsonOutput.coverageMap
          ? this.parseCoverage(jsonOutput.coverageMap)
          : null,
        errors:
          jsonOutput.testResults?.flatMap((tr: any) =>
            tr.assertionResults
              ?.filter((ar: any) => ar.status === 'failed')
              .map(
                (ar: any) => ar.failureMessages?.join(', ') || 'Unknown error'
              )
          ) || [],
      }
    } catch (error) {
      // JSON 파싱 실패 시 출력에서 정보 추출
      const lines = output.split('\n')
      const summary = lines.find((line) => line.includes('Test Suites:'))

      if (summary) {
        const passed = this.extractNumber(summary, /(\d+) passed/)
        const failed = this.extractNumber(summary, /(\d+) failed/)
        const total = passed + failed

        return {
          success: failed === 0,
          total,
          passed,
          failed,
          skipped: 0,
          coverage: null,
          errors: failed > 0 ? ['테스트 실패가 발생했습니다.'] : [],
        }
      }

      return {
        success: false,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        coverage: null,
        errors: ['테스트 결과 파싱 실패'],
      }
    }
  }

  private parseCoverage(coverageMap: any): CoverageResult {
    const summary = coverageMap.getCoverageSummary()

    return {
      lines: {
        total: summary.lines.total,
        covered: summary.lines.covered,
        percentage: summary.lines.pct,
      },
      functions: {
        total: summary.functions.total,
        covered: summary.functions.covered,
        percentage: summary.functions.pct,
      },
      branches: {
        total: summary.branches.total,
        covered: summary.branches.covered,
        percentage: summary.branches.pct,
      },
      statements: {
        total: summary.statements.total,
        covered: summary.statements.covered,
        percentage: summary.statements.pct,
      },
    }
  }

  private extractNumber(text: string, regex: RegExp): number {
    const match = text.match(regex)
    return match ? parseInt(match[1], 10) : 0
  }

  private printSuiteResult(result: TestResult): void {
    const icon = result.success ? '✅' : '❌'
    const status = result.success ? 'PASS' : 'FAIL'

    console.log(`\n${icon} ${result.suite.toUpperCase()} - ${status}`)
    console.log(`   총 테스트: ${result.total}`)
    console.log(`   성공: ${result.passed}`)
    console.log(`   실패: ${result.failed}`)
    console.log(`   스킵: ${result.skipped}`)
    console.log(`   실행 시간: ${this.formatDuration(result.duration)}`)

    if (result.coverage) {
      console.log(
        `   커버리지: ${result.coverage.statements.percentage.toFixed(1)}%`
      )
    }

    if (result.errors.length > 0) {
      console.log('   에러:')
      result.errors.forEach((error) => console.log(`     - ${error}`))
    }
  }

  private printSummary(totalDuration: number): void {
    console.log('\n' + '='.repeat(80))
    console.log('📋 테스트 실행 요약')
    console.log('='.repeat(80))

    const totalTests = Array.from(this.results.values()).reduce(
      (sum, r) => sum + r.total,
      0
    )
    const totalPassed = Array.from(this.results.values()).reduce(
      (sum, r) => sum + r.passed,
      0
    )
    const totalFailed = Array.from(this.results.values()).reduce(
      (sum, r) => sum + r.failed,
      0
    )
    const successfulSuites = Array.from(this.results.values()).filter(
      (r) => r.success
    ).length

    console.log(`총 테스트 스위트: ${this.results.size}`)
    console.log(`성공한 스위트: ${successfulSuites}`)
    console.log(`실패한 스위트: ${this.results.size - successfulSuites}`)
    console.log(`총 테스트: ${totalTests}`)
    console.log(`성공: ${totalPassed}`)
    console.log(`실패: ${totalFailed}`)
    console.log(`전체 실행 시간: ${this.formatDuration(totalDuration)}`)

    const overallSuccess = Array.from(this.results.values()).every(
      (r) => r.success
    )
    const overallIcon = overallSuccess ? '🎉' : '💥'
    const overallStatus = overallSuccess
      ? '모든 테스트 통과!'
      : '일부 테스트 실패'

    console.log(`\n${overallIcon} ${overallStatus}`)
  }

  private printCoverageReport(coverage: CoverageResult | null): void {
    if (!coverage) {
      console.log('📊 커버리지 정보 없음')
      return
    }

    console.log('\n📊 코드 커버리지 리포트')
    console.log('-'.repeat(40))
    console.log(
      `라인:     ${coverage.lines.covered}/${coverage.lines.total} (${coverage.lines.percentage.toFixed(1)}%)`
    )
    console.log(
      `함수:     ${coverage.functions.covered}/${coverage.functions.total} (${coverage.functions.percentage.toFixed(1)}%)`
    )
    console.log(
      `브랜치:   ${coverage.branches.covered}/${coverage.branches.total} (${coverage.branches.percentage.toFixed(1)}%)`
    )
    console.log(
      `구문:     ${coverage.statements.covered}/${coverage.statements.total} (${coverage.statements.percentage.toFixed(1)}%)`
    )

    // 목표 커버리지 체크 (80%)
    const targetCoverage = 80
    const meetsTarget = [
      coverage.lines.percentage,
      coverage.functions.percentage,
      coverage.branches.percentage,
      coverage.statements.percentage,
    ].every((pct) => pct >= targetCoverage)

    const targetIcon = meetsTarget ? '✅' : '⚠️'
    const targetStatus = meetsTarget ? '목표 달성' : '목표 미달성'

    console.log(
      `\n${targetIcon} 커버리지 목표 (${targetCoverage}%): ${targetStatus}`
    )
  }

  private generateReport(): void {
    const report = {
      timestamp: new Date().toISOString(),
      issue: 'GitHub Issue #13',
      description: '사용자 인증 및 팀 관리 UI 테스트',
      suites: Array.from(this.results.entries()).map(([name, result]) => ({
        name,
        ...result,
      })),
      summary: {
        totalSuites: this.results.size,
        successfulSuites: Array.from(this.results.values()).filter(
          (r) => r.success
        ).length,
        totalTests: Array.from(this.results.values()).reduce(
          (sum, r) => sum + r.total,
          0
        ),
        totalPassed: Array.from(this.results.values()).reduce(
          (sum, r) => sum + r.passed,
          0
        ),
        totalFailed: Array.from(this.results.values()).reduce(
          (sum, r) => sum + r.failed,
          0
        ),
        overallSuccess: Array.from(this.results.values()).every(
          (r) => r.success
        ),
      },
    }

    const reportPath = join(process.cwd(), 'test-report.json')
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    console.log(`\n📄 상세 리포트 생성: ${reportPath}`)
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }
}

// 타입 정의
interface TestResult {
  suite: string
  success: boolean
  total: number
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage: CoverageResult | null
  errors: string[]
}

interface ParsedTestResult {
  success: boolean
  total: number
  passed: number
  failed: number
  skipped: number
  coverage: CoverageResult | null
  errors: string[]
}

interface CoverageResult {
  lines: CoverageMetric
  functions: CoverageMetric
  branches: CoverageMetric
  statements: CoverageMetric
}

interface CoverageMetric {
  total: number
  covered: number
  percentage: number
}

// CLI 실행
if (require.main === module) {
  const runner = new TestRunner()
  const command = process.argv[2]

  switch (command) {
    case 'all':
      runner.runAll()
      break
    case 'coverage':
      runner.runWithCoverage()
      break
    case 'quick':
      runner.runQuick()
      break
    case 'unit':
      runner.runSuite(TEST_SUITES.find((s) => s.name === 'unit')!)
      break
    case 'integration':
      runner.runSuite(TEST_SUITES.find((s) => s.name === 'integration')!)
      break
    case 'e2e':
      runner.runSuite(TEST_SUITES.find((s) => s.name === 'e2e')!)
      break
    case 'auth':
      runner.runSuite(TEST_SUITES.find((s) => s.name === 'auth')!)
      break
    case 'team':
      runner.runSuite(TEST_SUITES.find((s) => s.name === 'team')!)
      break
    default:
      console.log('사용법:')
      console.log('  npm run test:all        - 모든 테스트 실행')
      console.log('  npm run test:coverage   - 커버리지와 함께 실행')
      console.log('  npm run test:quick      - 유닛 테스트만 실행')
      console.log('  npm run test:unit       - 유닛 테스트')
      console.log('  npm run test:integration- 통합 테스트')
      console.log('  npm run test:e2e        - E2E 테스트')
      console.log('  npm run test:auth       - 인증 테스트')
      console.log('  npm run test:team       - 팀 관리 테스트')
      break
  }
}

export { TestRunner }
