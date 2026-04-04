import logging, dotenv, os
dotenv.load_dotenv()
os.environ.setdefault('PYTORCH_CUDA_ALLOC_CONF', 'expandable_segments:True')
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

if __name__ == '__main__':
    from pipeline.run import run
    report = run('capstone-pitch.mp3', session_id='1b7bf2fe', max_iterations=2)
    print('SESSION:', report['session_id'])
    print('ITERATIONS:', report['n_iterations'])
    print('IMPROVEMENT:', report['improvement_pct'], '%')
