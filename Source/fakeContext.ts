import { Context } from '@actions/github/lib/context';


const fakeContext = function() {
    const context = new Context();

    Object.defineProperty(context, "sha", {
        get: () => {
            return 'cf05d51ebb7a068849e3a03ceaf969cc22dfeff7';
        }
    });
    
    Object.defineProperty(context, "issue", {
        get: () => {
            return {
                owner: '',
                repo: '',
                number: 42
            };
        }
    });
    
    Object.defineProperty(context, "repo", {
        get: () => {
            return {
                owner: '',
                repo: ''
            };
        }
    });

    return context;
};

export default fakeContext;