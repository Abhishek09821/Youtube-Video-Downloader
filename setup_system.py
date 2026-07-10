#!/usr/bin/env python3
"""
VDOWN v5.0 Setup and Verification Script
Checks dependencies, configuration, and system readiness.
"""

import sys
import subprocess
import importlib.util
from pathlib import Path


class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")


def print_success(text):
    print(f"{Colors.GREEN}✓{Colors.RESET} {text}")


def print_warning(text):
    print(f"{Colors.YELLOW}⚠{Colors.RESET} {text}")


def print_error(text):
    print(f"{Colors.RED}✗{Colors.RESET} {text}")


def print_info(text):
    print(f"  {text}")


def check_python_version():
    """Check Python version."""
    print_header("Step 1: Checking Python Version")
    
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        print_success(f"Python {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print_error(f"Python {version.major}.{version.minor} (need 3.8+)")
        return False


def check_ffmpeg():
    """Check if FFmpeg is installed."""
    print_header("Step 2: Checking FFmpeg")
    
    try:
        result = subprocess.run(
            ['ffmpeg', '-version'],
            capture_output=True,
            timeout=5
        )
        if result.returncode == 0:
            version_line = result.stdout.decode().split('\n')[0]
            print_success(f"FFmpeg found: {version_line}")
            return True
        else:
            print_error("FFmpeg found but returned error")
            return False
    except FileNotFoundError:
        print_error("FFmpeg not found in PATH")
        print_info("Install with:")
        print_info("  macOS:    brew install ffmpeg")
        print_info("  Ubuntu:   sudo apt install ffmpeg")
        print_info("  Windows:  Download from ffmpeg.org")
        return False
    except Exception as e:
        print_error(f"Error checking FFmpeg: {e}")
        return False


def check_python_packages():
    """Check if required Python packages are installed."""
    print_header("Step 3: Checking Python Packages")
    
    required = {
        'flask': 'Flask',
        'flask_cors': 'flask-cors',
        'yt_dlp': 'yt-dlp',
        'whisper': 'openai-whisper',
        'torch': 'torch',
        'dotenv': 'python-dotenv',
        'filelock': 'filelock',
    }
    
    all_found = True
    
    for module_name, package_name in required.items():
        spec = importlib.util.find_spec(module_name)
        if spec is not None:
            try:
                module = importlib.import_module(module_name)
                version = getattr(module, '__version__', 'unknown')
                print_success(f"{package_name}: {version}")
            except Exception:
                print_success(f"{package_name}: installed")
        else:
            print_error(f"{package_name}: NOT FOUND")
            all_found = False
    
    if not all_found:
        print_info("\nInstall missing packages with:")
        print_info("  pip install -r requirements.txt")
    
    return all_found


def check_directories():
    """Check if required directories exist."""
    print_header("Step 4: Checking Directories")
    
    dirs = [
        ('downloads', 'Download directory'),
        ('cache/subtitles', 'Subtitle cache directory'),
        ('frontend/dist', 'Frontend build directory'),
    ]
    
    all_exist = True
    
    for dir_path, description in dirs:
        path = Path(dir_path)
        if path.exists():
            print_success(f"{description}: {path}")
        else:
            if dir_path == 'frontend/dist':
                print_warning(f"{description}: NOT FOUND (run: cd frontend && npm run build)")
            else:
                print_info(f"{description}: Will be created automatically")
    
    return True


def check_env_file():
    """Check .env configuration file."""
    print_header("Step 5: Checking Configuration")
    
    env_path = Path('.env')
    example_path = Path('.env.example')
    
    if env_path.exists():
        print_success(f".env file found: {env_path}")
        
        # Read and check key settings
        with open(env_path) as f:
            content = f.read()
            
        if 'WHISPER_MODEL' in content:
            print_info("Configuration looks good")
        else:
            print_warning("Configuration may be incomplete")
        
        return True
    else:
        print_warning(".env file NOT FOUND")
        if example_path.exists():
            print_info("Create from example:")
            print_info("  cp .env.example .env")
        return False


def test_whisper_import():
    """Test Whisper import and basic functionality."""
    print_header("Step 6: Testing Whisper")
    
    try:
        import whisper
        print_success("Whisper imported successfully")
        
        # Check available models
        models = ["tiny", "base", "small", "medium", "large", "large-v2", "large-v3"]
        print_info(f"Available models: {', '.join(models)}")
        
        # Check device
        try:
            import torch
            if torch.cuda.is_available():
                print_success("CUDA available (GPU acceleration possible)")
                print_info(f"GPU: {torch.cuda.get_device_name(0)}")
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                print_success("Apple Silicon MPS available (GPU acceleration possible)")
            else:
                print_info("Using CPU (consider GPU for faster processing)")
        except Exception as e:
            print_warning(f"Could not check GPU: {e}")
        
        return True
        
    except ImportError as e:
        print_error(f"Whisper import failed: {e}")
        print_info("Install with: pip install openai-whisper")
        return False
    except Exception as e:
        print_error(f"Whisper test failed: {e}")
        return False


def check_production_modules():
    """Check if production subtitle modules can be imported."""
    print_header("Step 7: Checking Production Modules")
    
    modules = [
        'config',
        'models',
        'services.subtitle_service',
        'services.whisper_service',
        'services.subtitle_cache',
        'services.subtitle_formatter',
        'utils.video_utils',
        'utils.logging_utils',
    ]
    
    all_found = True
    
    for module_name in modules:
        try:
            importlib.import_module(module_name)
            print_success(f"{module_name}")
        except Exception as e:
            print_error(f"{module_name}: {e}")
            all_found = False
    
    return all_found


def print_summary(checks):
    """Print final summary."""
    print_header("Setup Summary")
    
    passed = sum(checks.values())
    total = len(checks)
    
    for check_name, result in checks.items():
        if result:
            print_success(check_name)
        else:
            print_error(check_name)
    
    print(f"\n{Colors.BOLD}Result: {passed}/{total} checks passed{Colors.RESET}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✓ System ready for production!{Colors.RESET}")
        print(f"\nStart the server with:")
        print(f"  {Colors.BOLD}python server.py{Colors.RESET}")
        print(f"\nThen visit: {Colors.BOLD}http://localhost:8080{Colors.RESET}")
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠ Some checks failed{Colors.RESET}")
        print(f"\nFix the issues above, then run this script again.")
        print(f"\nFor help, see:")
        print(f"  • SETUP.md")
        print(f"  • SUBTITLE_SYSTEM.md")


def main():
    """Run all checks."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}VDOWN v5.0 System Setup & Verification{Colors.RESET}")
    
    checks = {
        'Python Version (3.8+)': check_python_version(),
        'FFmpeg Installation': check_ffmpeg(),
        'Python Packages': check_python_packages(),
        'Directory Structure': check_directories(),
        'Configuration (.env)': check_env_file(),
        'Whisper AI': test_whisper_import(),
        'Production Modules': check_production_modules(),
    }
    
    print_summary(checks)
    
    return 0 if all(checks.values()) else 1


if __name__ == '__main__':
    sys.exit(main())
