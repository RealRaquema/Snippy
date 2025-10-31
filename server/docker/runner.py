import sys
import traceback
from pathlib import Path

def run_code():
    try:
        # Check if main.py exists
        main_file = Path('/app/main.py')
        if not main_file.exists():
            print("Error: /app/main.py not found", file=sys.stderr)
            sys.exit(2)
            
        # Read and execute the code
        with open(main_file, 'r') as f:
            code = f.read()
            
        # Execute in a clean namespace
        exec(code, {'__name__': '__main__'})
            
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    run_code()